type EndpointStats = {
  endpoint: string;
  requests: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  status304: number;
  bytes: number;
  lastSeenAt: string;
};

type Snapshot = {
  since: string;
  totals: {
    requests: number;
    bytes: number;
    status304: number;
  };
  uploads: {
    totalCount: number;
    totalBytes: number;
    imageCount: number;
    imageBytes: number;
    videoCount: number;
    videoBytes: number;
    lastSeenAt: string | null;
  };
  adMedia: {
    requests: number;
    redirects: number;
    estimatedBytes: number;
    lastSeenAt: string | null;
  };
  topAds: Array<{
    adId: number;
    companyId: number | null;
    requests: number;
    redirects: number;
    estimatedBytes: number;
    lastSeenAt: string;
  }>;
  uploadTrend: Array<{
    hour: string;
    uploads: number;
    totalBytes: number;
    imageBytes: number;
    videoBytes: number;
  }>;
  endpoints: EndpointStats[];
};

const MAX_ENDPOINTS = 500;

function normalizeEndpoint(pathname: string): string {
  if (pathname.startsWith('/api/shops/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 4) {
      const rest = parts.slice(3).map((part) => (/^\d+$/.test(part) ? ':id' : part));
      return `/api/shops/:slug/${rest.join('/')}`;
    }
    return '/api/shops/:slug';
  }
  if (pathname.startsWith('/api/tickets/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 3) {
      const rest = parts.slice(2).map((part) => (/^\d+$/.test(part) ? ':id' : part));
      return `/api/tickets/${rest.join('/')}`;
    }
    return '/api/tickets';
  }
  if (pathname.startsWith('/api/ads/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 3) {
      const rest = parts.slice(2).map((part) => (/^\d+$/.test(part) ? ':id' : part));
      return `/api/ads/${rest.join('/')}`;
    }
    return '/api/ads';
  }
  return pathname;
}

export class EgressStatsService {
  private readonly startedAt = new Date();
  private readonly byEndpoint = new Map<string, EndpointStats>();
  private readonly adUsageById = new Map<number, {
    adId: number;
    companyId: number | null;
    requests: number;
    redirects: number;
    estimatedBytes: number;
    lastSeenAt: string;
  }>();
  private readonly uploadByHour = new Map<string, {
    hour: string;
    uploads: number;
    totalBytes: number;
    imageBytes: number;
    videoBytes: number;
  }>();
  private uploads = {
    totalCount: 0,
    totalBytes: 0,
    imageCount: 0,
    imageBytes: 0,
    videoCount: 0,
    videoBytes: 0,
    lastSeenAt: null as string | null,
  };
  private readonly maxHourlyBuckets = 24 * 14; // keep two weeks of hourly buckets
  private adMedia = {
    requests: 0,
    redirects: 0,
    estimatedBytes: 0,
    lastSeenAt: null as string | null,
  };

  record(pathname: string, statusCode: number, contentLength: number): void {
    const endpoint = normalizeEndpoint(pathname);
    const nowIso = new Date().toISOString();
    const existing = this.byEndpoint.get(endpoint) ?? {
      endpoint,
      requests: 0,
      status2xx: 0,
      status3xx: 0,
      status4xx: 0,
      status5xx: 0,
      status304: 0,
      bytes: 0,
      lastSeenAt: nowIso,
    };

    existing.requests += 1;
    existing.bytes += Math.max(0, Number.isFinite(contentLength) ? contentLength : 0);
    existing.lastSeenAt = nowIso;
    if (statusCode >= 200 && statusCode < 300) existing.status2xx += 1;
    if (statusCode >= 300 && statusCode < 400) existing.status3xx += 1;
    if (statusCode >= 400 && statusCode < 500) existing.status4xx += 1;
    if (statusCode >= 500) existing.status5xx += 1;
    if (statusCode === 304) existing.status304 += 1;

    this.byEndpoint.set(endpoint, existing);

    if (this.byEndpoint.size > MAX_ENDPOINTS) {
      const sorted = [...this.byEndpoint.values()].sort(
        (a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime()
      );
      const toDelete = sorted.slice(0, this.byEndpoint.size - MAX_ENDPOINTS);
      for (const row of toDelete) {
        this.byEndpoint.delete(row.endpoint);
      }
    }
  }

  recordUpload(bytes: number, mediaType: 'image' | 'video', _companyId?: number): void {
    const safeBytes = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
    const nowIso = new Date().toISOString();
    const hour = nowIso.slice(0, 13) + ':00:00.000Z';
    this.uploads.totalCount += 1;
    this.uploads.totalBytes += safeBytes;
    this.uploads.lastSeenAt = nowIso;
    const bucket = this.uploadByHour.get(hour) ?? {
      hour,
      uploads: 0,
      totalBytes: 0,
      imageBytes: 0,
      videoBytes: 0,
    };
    bucket.uploads += 1;
    bucket.totalBytes += safeBytes;
    if (mediaType === 'video') {
      this.uploads.videoCount += 1;
      this.uploads.videoBytes += safeBytes;
      bucket.videoBytes += safeBytes;
      this.uploadByHour.set(hour, bucket);
      this.trimHourlyBuckets();
      return;
    }
    this.uploads.imageCount += 1;
    this.uploads.imageBytes += safeBytes;
    bucket.imageBytes += safeBytes;
    this.uploadByHour.set(hour, bucket);
    this.trimHourlyBuckets();
  }

  recordAdMediaRequest(estimatedBytes: number, redirected: boolean, adId?: number, companyId?: number | null): void {
    const safeBytes = Math.max(0, Number.isFinite(estimatedBytes) ? estimatedBytes : 0);
    const nowIso = new Date().toISOString();
    this.adMedia.requests += 1;
    this.adMedia.estimatedBytes += safeBytes;
    this.adMedia.lastSeenAt = nowIso;
    if (redirected) this.adMedia.redirects += 1;
    if (adId == null) return;
    const existing = this.adUsageById.get(adId) ?? {
      adId,
      companyId: companyId ?? null,
      requests: 0,
      redirects: 0,
      estimatedBytes: 0,
      lastSeenAt: nowIso,
    };
    existing.requests += 1;
    existing.estimatedBytes += safeBytes;
    existing.lastSeenAt = nowIso;
    if (redirected) existing.redirects += 1;
    this.adUsageById.set(adId, existing);
  }

  private trimHourlyBuckets(): void {
    if (this.uploadByHour.size <= this.maxHourlyBuckets) return;
    const sorted = [...this.uploadByHour.keys()].sort();
    const overflow = this.uploadByHour.size - this.maxHourlyBuckets;
    for (const hour of sorted.slice(0, overflow)) {
      this.uploadByHour.delete(hour);
    }
  }

  snapshot(limit = 100): Snapshot {
    const endpoints = [...this.byEndpoint.values()]
      .sort((a, b) => b.bytes - a.bytes || b.requests - a.requests)
      .slice(0, Math.max(1, limit));
    const totals = endpoints.reduce(
      (acc, row) => {
        acc.requests += row.requests;
        acc.bytes += row.bytes;
        acc.status304 += row.status304;
        return acc;
      },
      { requests: 0, bytes: 0, status304: 0 }
    );

    return {
      since: this.startedAt.toISOString(),
      totals,
      uploads: { ...this.uploads },
      adMedia: { ...this.adMedia },
      topAds: [...this.adUsageById.values()]
        .sort((a, b) => b.estimatedBytes - a.estimatedBytes || b.requests - a.requests)
        .slice(0, 25),
      uploadTrend: [...this.uploadByHour.values()].sort((a, b) => a.hour.localeCompare(b.hour)),
      endpoints,
    };
  }
}

let singleton: EgressStatsService | null = null;

export function getEgressStatsService(): EgressStatsService {
  if (!singleton) singleton = new EgressStatsService();
  return singleton;
}
