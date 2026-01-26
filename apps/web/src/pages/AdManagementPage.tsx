import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { api, ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { isRootBuild } from '@/lib/build';
import { Container } from '@/components/design-system/Spacing/Container';

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
  const { isCompanyAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null); // Ad ID being uploaded
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not company admin
  useEffect(() => {
    if (!isCompanyAdmin) {
      navigate('/company/login');
    }
  }, [isCompanyAdmin, navigate]);

  // Load ads on mount
  useEffect(() => {
    loadAds();
  }, []);

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
      setError(getErrorMessage(err, 'Erro ao carregar anúncios'));
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
      setError('Tipo de arquivo inválido. Use imagens (PNG, JPEG, WebP) ou vídeos (MP4).');
      return;
    }

    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedVideoTypes = ['video/mp4'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.type)) {
      setError(`Tipo de arquivo inválido. Use ${allowedTypes.join(', ')}.`);
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Tamanho máximo: 50MB.');
      return;
    }

    try {
      setUploading(-1); // Use -1 to indicate new upload (no ad ID yet)
      setUploadProgress(0);
      setError(null);
      setSuccess(null);

      // Upload file directly
      setUploadProgress(50);
      await api.uploadAd(file, undefined, undefined);
      
      setUploadProgress(100);
      setSuccess('Anúncio enviado com sucesso!');
      
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
      setError(getErrorMessage(err, 'Erro ao fazer upload do anúncio'));
      setUploadProgress(0);
      setUploading(null);
    }
  };

  const handleToggleEnabled = async (adId: number, currentEnabled: boolean) => {
    try {
      setError(null);
      await api.updateAd(adId, { enabled: !currentEnabled });
      setSuccess(`Anúncio ${!currentEnabled ? 'ativado' : 'desativado'} com sucesso!`);
      await loadAds();
    } catch (err) {
      // Don't show error for auth errors - onAuthError callback will handle redirect
      if (err instanceof ApiError && err.isAuthError()) {
        // Auth error - onAuthError callback will redirect to login
        return;
      }
      setError(getErrorMessage(err, 'Erro ao atualizar anúncio'));
    }
  };

  const handleDelete = async (adId: number) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) {
      return;
    }

    try {
      setError(null);
      await api.deleteAd(adId);
      setSuccess('Anúncio excluído com sucesso!');
      await loadAds();
    } catch (err) {
      // Don't show error for auth errors - onAuthError callback will handle redirect
      if (err instanceof ApiError && err.isAuthError()) {
        // Auth error - onAuthError callback will redirect to login
        return;
      }
      setError(getErrorMessage(err, 'Erro ao excluir anúncio'));
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />
      <main className="py-20">
        <Container size="2xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Gerenciar Anúncios</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              Faça upload e gerencie os anúncios exibidos no modo kiosk
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

          {/* Upload Section */}
          <div className="mb-8 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Adicionar Novo Anúncio</h2>
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
                        <span>Enviando... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">upload</span>
                          <span>Escolher arquivo</span>
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
              PNG, JPEG, WebP ou MP4. Máximo 50MB
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
                  <p>Nenhum anúncio cadastrado ainda.</p>
                  <p className="text-sm mt-2">Faça upload de um arquivo acima para começar.</p>
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
                              Anúncio #{ad.position} ({ad.mediaType === 'image' ? 'Imagem' : 'Vídeo'})
                            </h3>
                            <p className="text-sm text-white/60">
                              {ad.mimeType} • {formatFileSize(ad.bytes)}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {ad.enabled ? (
                                <span className="text-green-400">✓ Ativo</span>
                              ) : (
                                <span className="text-yellow-400">⚠ Inativo</span>
                              )}
                            </p>
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
                            {ad.enabled ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDelete(ad.id)}
                            className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all"
                          >
                            Excluir
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
                  Voltar ao Dashboard
                </button>
              </div>
        </Container>
        </main>
      </div>
    );
  }

  // Mineiro build - keep existing styling
  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="text-center mb-10">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37]">
            Gerenciar Anúncios
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Faça upload e gerencie os anúncios exibidos no modo kiosk
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

        {/* Upload Section */}
        <div className="mb-8 bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Adicionar Novo Anúncio</h2>
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
                        ? 'border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.1)] cursor-wait'
                        : 'border-[rgba(212,175,55,0.3)] hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                  {uploading !== null ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                      <span>Enviando... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">upload</span>
                          <span>Escolher arquivo</span>
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
            PNG, JPEG, WebP ou MP4. Máximo 50MB
              </p>
            </div>

        {loading ? (
          <div className="text-center text-white/60 py-12">
            <div className="inline-block animate-spin text-[#D4AF37] text-4xl mb-4">
              <span className="material-symbols-outlined">refresh</span>
            </div>
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.length === 0 ? (
              <div className="text-center text-white/60 py-12 border border-[rgba(212,175,55,0.3)] rounded-2xl">
                <p>Nenhum anúncio cadastrado ainda.</p>
                <p className="text-sm mt-2">Faça upload de um arquivo acima para começar.</p>
                </div>
            ) : (
              ads.map((ad) => (
                <div
                  key={ad.id}
                  className={`bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-6 ${
                    !ad.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {ad.mediaType === 'image' ? (
                        <img
                          src={`/api/ads/${ad.id}/media?v=${ad.version}`}
                          alt={`Anúncio ${ad.position}`}
                          className="w-32 h-32 object-contain bg-black rounded-lg border border-[rgba(212,175,55,0.3)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                      ) : (
                        <video
                          src={`/api/ads/${ad.id}/media?v=${ad.version}`}
                          className="w-32 h-32 object-contain bg-black rounded-lg border border-[rgba(212,175,55,0.3)]"
                          controls={false}
                          muted
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Anúncio #{ad.position} ({ad.mediaType === 'image' ? 'Imagem' : 'Vídeo'})
                          </h3>
                          <p className="text-sm text-white/60">
                            {ad.mimeType} • {formatFileSize(ad.bytes)}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            {ad.enabled ? (
                              <span className="text-green-400">✓ Ativo</span>
                            ) : (
                              <span className="text-yellow-400">⚠ Inativo</span>
                            )}
                          </p>
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
                          {ad.enabled ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all"
                        >
                          Excluir
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
                className="px-6 py-2.5 bg-transparent text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.2)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center gap-3 mx-auto text-sm"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Voltar ao Dashboard
              </button>
            </div>
      </main>
    </div>
  );
}
