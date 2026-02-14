import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { api, ApiError } from '@/lib/api';
import type { AdOrder } from '@/lib/api/companies';
import { getErrorMessage } from '@/lib/utils';
import { isRootBuild } from '@/lib/build';
import { Container } from '@/components/design-system/Spacing/Container';
import type { ShopAdminView } from '@eutonafila/shared';

interface Ad {
  id: number;
  companyId: number;
  shopId: number | null;
  position: number;
  enabled: boolean;
  mediaType: string;
  mimeType: string;
  bytes: number;
  storageKey: string;
  publicUrl: string;
  etag: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function AdManagementPage() {
  const { isCompanyAdmin, user } = useAuthContext();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [shops, setShops] = useState<ShopAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadShopId, setUploadShopId] = useState<number | null>(null); // null = all shops
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<AdOrder[]>([]);
  const [pendingOrdersLoading, setPendingOrdersLoading] = useState(false);
  const [actingOrderId, setActingOrderId] = useState<number | null>(null);

  const companyId = user?.companyId ?? null;

  // Redirect if not company admin
  useEffect(() => {
    if (!isCompanyAdmin) {
      navigate('/company/login');
    }
  }, [isCompanyAdmin, navigate]);

  // Load company shops
  useEffect(() => {
    if (!companyId) return;
    api.getCompanyShops(companyId).then(setShops).catch(() => setShops([]));
  }, [companyId]);

  // Load ads on mount
  useEffect(() => {
    loadAds();
  }, []);

  // Load pending ad orders
  useEffect(() => {
    if (!companyId) return;
    setPendingOrdersLoading(true);
    api
      .getAdOrders(companyId, 'pending_approval')
      .then(setPendingOrders)
      .catch(() => setPendingOrders([]))
      .finally(() => setPendingOrdersLoading(false));
  }, [companyId]);

  const loadAds = async () => {
    try {
        setLoading(true);
      setError(null);
      const loadedAds = await api.getAds();
      setAds(loadedAds);
    } catch (err) {
      // Don't show error for auth errors - onAuthError callback will handle redirect
      if (err instanceof ApiError && err.isAuthError()) {
        // Auth error - onAuthError callback will redirect to login
        // Don't set error state to avoid showing error message before redirect
        return;
      }
      setError(getErrorMessage(err, t('ads.loadError')));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    // Determine media type from MIME type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      setError(t('ads.invalidFileType'));
      return;
    }

    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedVideoTypes = ['video/mp4'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.type)) {
      setError(t('ads.invalidFileType'));
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(t('ads.fileTooBig'));
      return;
    }

    try {
      setUploading(-1); // Use -1 to indicate new upload (no ad ID yet)
      setUploadProgress(0);
      setError(null);
      setSuccess(null);

      // Upload file directly (uploadShopId: null = all shops)
      setUploadProgress(50);
      await api.uploadAd(file, uploadShopId ?? undefined, undefined);
      
      setUploadProgress(100);
      setSuccess(t('ads.uploadSuccess'));
      
      // Reload ads
      await loadAds();
      
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploading(null);
      }, 1000);
    } catch (err) {
      console.error('[AdManagement] Upload failed:', err);
      // Don't show error for auth errors - onAuthError callback will handle redirect
      if (err instanceof ApiError && err.isAuthError()) {
        // Auth error - onAuthError callback will redirect to login
        // Don't set error state to avoid showing error message before redirect
        setUploading(null);
        setUploadProgress(0);
        return;
      }
      setError(getErrorMessage(err, t('ads.uploadError')));
      setUploadProgress(0);
      setUploading(null);
    }
  };

  const handleToggleEnabled = async (adId: number, currentEnabled: boolean) => {
    try {
      setError(null);
      await api.updateAd(adId, { enabled: !currentEnabled });
      setSuccess(!currentEnabled ? t('ads.toggleSuccess') : t('ads.toggleSuccessOff'));
      await loadAds();
    } catch (err) {
      // Don't show error for auth errors - onAuthError callback will handle redirect
      if (err instanceof ApiError && err.isAuthError()) {
        // Auth error - onAuthError callback will redirect to login
        return;
      }
      setError(getErrorMessage(err, t('ads.updateError')));
    }
  };

  const handleDelete = async (adId: number) => {
    if (!confirm(t('ads.deleteConfirm'))) {
      return;
    }

    try {
      setError(null);
      await api.deleteAd(adId);
      setSuccess(t('ads.deleteSuccess'));
      await loadAds();
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError()) return;
      setError(getErrorMessage(err, t('ads.deleteError')));
    }
  };

  const handleUpdateShopId = async (adId: number, newShopId: number | null) => {
    try {
      setError(null);
      await api.updateAd(adId, { shopId: newShopId });
      setSuccess(t('ads.assignSuccess'));
      await loadAds();
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError()) return;
      setError(getErrorMessage(err, t('ads.updateError')));
    }
  };

  const loadPendingOrders = () => {
    if (!companyId) return;
    api.getAdOrders(companyId, 'pending_approval').then(setPendingOrders).catch(() => setPendingOrders([]));
  };

  const handleAdOrderAction = async (orderId: number, action: 'approve' | 'reject' | 'mark_paid') => {
    if (!companyId) return;
    setActingOrderId(orderId);
    setError(null);
    try {
      await api.patchAdOrder(companyId, orderId, { action });
      if (action === 'approve') {
        setSuccess(t('ads.approveSuccess'));
        await loadAds();
      } else if (action === 'reject') {
        setSuccess(t('ads.rejectSuccess'));
      } else {
        setSuccess(t('ads.markPaidSuccess'));
      }
      loadPendingOrders();
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError()) return;
      setError(getErrorMessage(err, t('ads.updateError')));
    } finally {
      setActingOrderId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isCompanyAdmin) {
    return null;
  }

  const useRootTheme = isRootBuild();

  if (useRootTheme) {
    return (
    <div className="min-h-screen bg-[var(--shop-background)] text-[var(--shop-text-primary)]">
      <RootSiteNav />
      <main className="py-20">
        <Container size="2xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">{t('ads.title')}</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              {t('ads.uploadSubtext')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
              {success}
            </div>
          )}

          {/* Pending ad requests */}
          <div className="mb-8 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">{t('ads.pendingRequests')}</h2>
            {pendingOrdersLoading ? (
              <p className="text-white/60 text-sm">{t('ads.loading')}</p>
            ) : pendingOrders.length === 0 ? (
              <p className="text-white/50 text-sm">{t('ads.noPendingRequests')}</p>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    {order.imagePublicUrl ? (
                      <img
                        src={order.imagePublicUrl}
                        alt=""
                        className="w-24 h-24 object-contain bg-black rounded-lg border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 text-xs flex-shrink-0">
                        No image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{order.advertiserName}</p>
                      <p className="text-sm text-white/60">{order.advertiserEmail}</p>
                      <p className="text-xs text-white/50 mt-1">
                        {t('ads.duration')}: {order.durationSeconds}s · {t('ads.shopsCount')}:{' '}
                        {Array.isArray(order.shopIds) && order.shopIds.length > 0
                          ? order.shopIds.length
                          : t('ads.allShops')}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {t('ads.createdAt')}: {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdOrderAction(order.id, 'approve')}
                        disabled={actingOrderId === order.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        {t('ads.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdOrderAction(order.id, 'reject')}
                        disabled={actingOrderId === order.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {t('ads.reject')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdOrderAction(order.id, 'mark_paid')}
                        disabled={actingOrderId === order.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 disabled:opacity-50"
                      >
                        {t('ads.markPaid')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="mb-8 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">{t('ads.addNew')}</h2>
            {shops.length > 0 && (
              <div className="mb-4">
                <label className="block text-white/60 text-sm mb-2">{t('ads.showIn')}</label>
                <select
                  value={uploadShopId === null ? '' : String(uploadShopId)}
                  onChange={(e) => setUploadShopId(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  className="form-select w-full max-w-xs px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value="">{t('ads.allShops')}</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
              <label className="block">
                <input
                  type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                    handleFileUpload(file);
                    }
                  }}
                disabled={uploading !== null}
                  className="hidden"
                id="ad-upload"
                />
                <div className="flex items-center gap-3">
                  <label
                  htmlFor="ad-upload"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                    uploading !== null
                        ? 'border-blue-500/50 bg-blue-500/10 cursor-wait'
                        : 'border-white/20 hover:border-blue-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-blue-400">
                    {uploading !== null ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                        <span>{t('ads.sending')} {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">upload</span>
                          <span>{t('ads.chooseFile')}</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </label>
            {uploading !== null && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
              <p className="text-xs text-white/40 mt-2">
              {t('ads.maxSizeHint')}
              </p>
            </div>

          {loading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="inline-block animate-spin text-blue-400 text-4xl mb-4">
                <span className="material-symbols-outlined">refresh</span>
              </div>
              <p>Carregando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ads.length === 0 ? (
                <div className="text-center text-gray-400 py-12 border border-white/10 rounded-2xl">
                  <p>{t('ads.noAdsYet')}</p>
                  <p className="text-sm mt-2">{t('ads.uploadHint')}</p>
                </div>
              ) : (
                ads.map((ad) => (
                  <div
                    key={ad.id}
                    className={`border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-6 ${
                      !ad.enabled ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {ad.mediaType === 'image' ? (
                          <img
                            src={`/api/ads/${ad.id}/media?v=${ad.version}`}
                            alt={`Anúncio ${ad.position}`}
                            className="w-32 h-32 object-contain bg-black rounded-lg border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                        ) : (
                          <video
                            src={`/api/ads/${ad.id}/media?v=${ad.version}`}
                            className="w-32 h-32 object-contain bg-black rounded-lg border border-white/10"
                            controls={false}
                            muted
                  />
                )}
              </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {t('ads.adPosition')}{ad.position} ({ad.mediaType === 'image' ? t('ads.image') : t('ads.video')})
                            </h3>
                            <p className="text-sm text-white/60">
                              {ad.mimeType} • {formatFileSize(ad.bytes)}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {ad.enabled ? (
                                <span className="text-green-400">✓ {t('ads.active')}</span>
                              ) : (
                                <span className="text-yellow-400">⚠ {t('ads.inactive')}</span>
                              )}
                            </p>
                            {shops.length > 0 && (
                              <div className="mt-2">
                                <span className="text-white/50 text-xs">{t('ads.showIn')}: </span>
                                <select
                                  value={ad.shopId === null ? '' : String(ad.shopId)}
                                  onChange={(e) => handleUpdateShopId(ad.id, e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                  className="ml-1 px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 text-xs"
                                >
                                  <option value="">{t('ads.allShops')}</option>
                                  {shops.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleToggleEnabled(ad.id, ad.enabled)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              ad.enabled
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                            }`}
                          >
                            {ad.enabled ? t('ads.deactivate') : t('ads.activate')}
                          </button>
                          <button
                            onClick={() => handleDelete(ad.id)}
                            className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all"
                          >
                            {t('ads.deleteButton')}
                          </button>
                        </div>
                      </div>
                    </div>
                </div>
                ))
              )}
            </div>
          )}

              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate('/company/dashboard')}
                  className="px-6 py-2.5 bg-transparent text-gray-400 border border-white/20 rounded-lg hover:border-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3 mx-auto text-sm"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  {t('ads.backToDashboard')}
                </button>
              </div>
        </Container>
        </main>
      </div>
    );
  }

  // Mineiro build
  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <Container size="2xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              {t('ads.title')}
            </h1>
            <p className="text-white/70 text-base max-w-2xl mx-auto mt-2">
              {t('ads.uploadSubtext')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
              {success}
            </div>
          )}

          {/* Pending ad requests */}
          <div className="mb-8 border border-white/10 bg-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">{t('ads.pendingRequests')}</h2>
            {pendingOrdersLoading ? (
              <p className="text-white/60 text-sm">{t('ads.loading')}</p>
            ) : pendingOrders.length === 0 ? (
              <p className="text-white/50 text-sm">{t('ads.noPendingRequests')}</p>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    {order.imagePublicUrl ? (
                      <img
                        src={order.imagePublicUrl}
                        alt=""
                        className="w-24 h-24 object-contain bg-black rounded-lg border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 text-xs flex-shrink-0">
                        No image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{order.advertiserName}</p>
                      <p className="text-sm text-white/60">{order.advertiserEmail}</p>
                      <p className="text-xs text-white/50 mt-1">
                        {t('ads.duration')}: {order.durationSeconds}s · {t('ads.shopsCount')}:{' '}
                        {Array.isArray(order.shopIds) && order.shopIds.length > 0
                          ? order.shopIds.length
                          : t('ads.allShops')}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {t('ads.createdAt')}: {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdOrderAction(order.id, 'approve')}
                        disabled={actingOrderId === order.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        {t('ads.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdOrderAction(order.id, 'reject')}
                        disabled={actingOrderId === order.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {t('ads.reject')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdOrderAction(order.id, 'mark_paid')}
                        disabled={actingOrderId === order.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 disabled:opacity-50"
                      >
                        {t('ads.markPaid')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="mb-8 border border-white/10 bg-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">{t('ads.addNew')}</h2>
            {shops.length > 0 && (
              <div className="mb-4">
                <label className="block text-white/60 text-sm mb-2">{t('ads.showIn')}</label>
                <select
                  value={uploadShopId === null ? '' : String(uploadShopId)}
                  onChange={(e) => setUploadShopId(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  className="form-select w-full max-w-xs px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value="">{t('ads.allShops')}</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <label className="block">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading !== null}
                className="hidden"
                id="ad-upload-mineiro"
              />
              <div className="flex items-center gap-3">
                <label
                  htmlFor="ad-upload-mineiro"
                  className={`flex-1 px-4 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                    uploading !== null
                      ? 'border-white/30 bg-white/10 cursor-wait'
                      : 'border-white/20 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                    {uploading !== null ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                        <span>{t('ads.sending')} {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">upload</span>
                        <span>{t('ads.chooseFile')}</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </label>
            {uploading !== null && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[#D4AF37] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-white/40 mt-2">
              {t('ads.maxSizeHint')}
            </p>
          </div>

          {loading ? (
            <div className="text-center text-white/60 py-12">
              <div className="inline-block animate-spin text-[#D4AF37] text-4xl mb-4">
                <span className="material-symbols-outlined">refresh</span>
              </div>
              <p>{t('ads.loading')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ads.length === 0 ? (
                <div className="text-center text-white/60 py-12 border border-white/10 bg-white/5 rounded-2xl">
                  <p>{t('ads.noAdsYet')}</p>
                  <p className="text-sm mt-2">{t('ads.uploadHint')}</p>
                </div>
              ) : (
                ads.map((ad) => (
                  <div
                    key={ad.id}
                    className={`border border-white/10 bg-white/5 rounded-2xl p-6 ${!ad.enabled ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {ad.mediaType === 'image' ? (
                          <img
                            src={`/api/ads/${ad.id}/media?v=${ad.version}`}
                            alt={`${t('ads.adPosition')}${ad.position}`}
                            className="w-32 h-32 object-contain bg-black rounded-lg border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <video
                            src={`/api/ads/${ad.id}/media?v=${ad.version}`}
                            className="w-32 h-32 object-contain bg-black rounded-lg border border-white/10"
                            controls={false}
                            muted
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {t('ads.adPosition')}{ad.position} ({ad.mediaType === 'image' ? t('ads.image') : t('ads.video')})
                            </h3>
                            <p className="text-sm text-white/60">
                              {ad.mimeType} • {formatFileSize(ad.bytes)}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {ad.enabled ? (
                                <span className="text-green-400">✓ {t('ads.active')}</span>
                              ) : (
                                <span className="text-yellow-400">⚠ {t('ads.inactive')}</span>
                              )}
                            </p>
                            {shops.length > 0 && (
                              <div className="mt-2">
                                <span className="text-white/50 text-xs">{t('ads.showIn')}: </span>
                                <select
                                  value={ad.shopId === null ? '' : String(ad.shopId)}
                                  onChange={(e) => handleUpdateShopId(ad.id, e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                  className="ml-1 px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 text-xs"
                                >
                                  <option value="">{t('ads.allShops')}</option>
                                  {shops.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleToggleEnabled(ad.id, ad.enabled)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              ad.enabled
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                            }`}
                          >
                            {ad.enabled ? t('ads.deactivate') : t('ads.activate')}
                          </button>
                          <button
                            onClick={() => handleDelete(ad.id)}
                            className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all"
                          >
                            {t('ads.deleteButton')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/company/dashboard')}
              className="px-6 py-2.5 border border-white/20 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-3 mx-auto text-sm"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('ads.backToDashboard')}
            </button>
          </div>
        </Container>
      </main>
    </div>
  );
}
