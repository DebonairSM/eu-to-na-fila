export type UsageBucketRow = {
  shopId: number | null;
  endpointTag: string;
  method: string;
  clientContext: string;
  requestCount: number | null;
};

export type UsageShopRow = {
  id: number;
  name: string;
  slug: string;
};

export type DrilldownNode = {
  id: string;
  label: string;
  type: 'root' | 'shop' | 'detail';
  requestCount: number;
  parentId: string | null;
};

export type DrilldownEdge = {
  from: string;
  to: string;
  weight: number;
};

export function buildUsageDrilldownGraph(
  buckets: UsageBucketRow[],
  shops: UsageShopRow[],
  group: 'endpoint' | 'source',
  rootLabel: string,
  limit: number
): { nodes: DrilldownNode[]; edges: DrilldownEdge[] } {
  const totalRequests = buckets.reduce((sum, b) => sum + (b.requestCount ?? 0), 0);
  const nodes: DrilldownNode[] = [
    { id: 'root', label: rootLabel, type: 'root', requestCount: totalRequests, parentId: null },
  ];
  const edges: DrilldownEdge[] = [];
  const safeLimit = Math.max(1, limit);

  const shopMap = new Map(shops.map((s) => [s.id, s]));
  const byShop = new Map<number, number>();
  for (const b of buckets) {
    if (!b.shopId) continue;
    byShop.set(b.shopId, (byShop.get(b.shopId) ?? 0) + (b.requestCount ?? 0));
  }

  const topShops = Array.from(byShop.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, safeLimit);

  for (const [shopId, count] of topShops) {
    const shop = shopMap.get(shopId);
    const shopNodeId = `shop:${shopId}`;
    nodes.push({
      id: shopNodeId,
      label: shop ? `${shop.name} (${shop.slug})` : `Shop #${shopId}`,
      type: 'shop',
      requestCount: count,
      parentId: 'root',
    });
    edges.push({ from: 'root', to: shopNodeId, weight: count });
  }

  const detailByShop = new Map<string, number>();
  for (const b of buckets) {
    if (!b.shopId) continue;
    const detail = group === 'source' ? `${b.endpointTag}:${b.method}` : b.clientContext;
    const key = `${b.shopId}|${detail}`;
    detailByShop.set(key, (detailByShop.get(key) ?? 0) + (b.requestCount ?? 0));
  }

  const topDetails = Array.from(detailByShop.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, safeLimit);

  for (const [key, count] of topDetails) {
    const [shopIdStr, detail] = key.split('|');
    if (!topShops.some(([id]) => String(id) === shopIdStr)) continue;
    const shopNodeId = `shop:${shopIdStr}`;
    const nodeId = `detail:${shopIdStr}:${detail}`;
    nodes.push({
      id: nodeId,
      label: detail,
      type: 'detail',
      requestCount: count,
      parentId: shopNodeId,
    });
    edges.push({ from: shopNodeId, to: nodeId, weight: count });
  }

  return { nodes, edges };
}
