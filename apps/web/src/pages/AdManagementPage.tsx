import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { isRootBuild } from '@/lib/build';

interface AdStatus {
  ad1: { exists: boolean; path: string | null };
  ad2: { exists: boolean; path: string | null };
}

export function AdManagementPage() {
  const { isCompanyAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [adStatus, setAdStatus] = useState<AdStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ ad1: boolean; ad2: boolean }>({ ad1: false, ad2: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0); // Force image refresh after upload

  // Redirect if not company admin
  useEffect(() => {
    if (!isCompanyAdmin) {
      navigate('/company/login');
    }
  }, [isCompanyAdmin, navigate]);

  // Load ad status on mount
  useEffect(() => {
    loadAdStatus();
  }, []);

  const loadAdStatus = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const status = await api.getAdStatus();
      setAdStatus(status);
      return status;
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar status dos anúncios'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleFileUpload = async (adType: 'ad1' | 'ad2', file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo inválido. Use PNG, JPEG ou WebP.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Tamanho máximo: 10MB.');
      return;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = 60000; // 60 seconds timeout (increased from 30s, but should fail faster if server unreachable)
    const startTime = Date.now();

    try {
      setUploading((prev) => ({ ...prev, [adType]: true }));
      setError(null);
      setSuccess(null);

      console.log('[AdManagement] Starting upload for', adType, 'file size:', file.size, 'bytes');

      await api.uploadAdImage(file, adType, {
        timeout,
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;
      console.log('[AdManagement] Upload completed in', elapsed, 'ms');
      
      setSuccess(`Anúncio ${adType === 'ad1' ? '1' : '2'} atualizado com sucesso!`);
      
      // Reload status without showing loading spinner (to preserve success message visibility)
      await loadAdStatus(false);
      // Force image refresh by updating the key
      setImageKey(prev => prev + 1);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      console.error('[AdManagement] Upload failed after', elapsed, 'ms:', err);
      
      // Provide more specific error messages
      let errorMessage = getErrorMessage(err, `Erro ao fazer upload do anúncio ${adType === 'ad1' ? '1' : '2'}`);
      
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
          errorMessage = `Upload expirou após ${timeout / 1000} segundos. O servidor pode não estar acessível ou o arquivo é muito grande. Verifique se o servidor está rodando.`;
        } else if (err.message.includes('Cannot connect') || err.message.includes('not reachable') || err.message.includes('NetworkError')) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique se o servidor da API está rodando e acessível.';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e se o servidor está rodando.';
        } else if (err.message.includes('aborted') || err.message.includes('AbortError')) {
          errorMessage = 'Upload cancelado.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setUploading((prev) => ({ ...prev, [adType]: false }));
    }
  };

  if (!isCompanyAdmin) {
    return null;
  }

  const useRootTheme = isRootBuild();

  if (useRootTheme) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <RootSiteNav />
        <main className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Gerenciar Anúncios</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              Faça upload das imagens dos anúncios exibidos no modo kiosk
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

          {loading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="inline-block animate-spin text-blue-400 text-4xl mb-4">
                <span className="material-symbols-outlined">refresh</span>
              </div>
              <p>Carregando...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ad 1 */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Anúncio 1</h2>
                  <p className="text-sm text-white/60">
                    {adStatus?.ad1.exists ? (
                      <span className="text-green-400">✓ Imagem carregada</span>
                    ) : (
                      <span className="text-yellow-400">⚠ Nenhuma imagem</span>
                    )}
                  </p>
                </div>
                {adStatus?.ad1.exists && adStatus.ad1.path && (
                  <img
                    src={`${adStatus.ad1.path}?v=${imageKey}`}
                    alt="Anúncio 1"
                    className="w-24 h-24 object-contain bg-black rounded-lg border border-white/10"
                    key={`ad1-${imageKey}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <label className="block">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload('ad1', file);
                    }
                  }}
                  disabled={uploading.ad1}
                  className="hidden"
                  id="ad1-upload"
                />
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="ad1-upload"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                      uploading.ad1
                        ? 'border-blue-500/50 bg-blue-500/10 cursor-wait'
                        : 'border-white/20 hover:border-blue-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-blue-400">
                      {uploading.ad1 ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                          <span>Enviando...</span>
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
              <p className="text-xs text-white/40 mt-2">
                PNG, JPEG ou WebP. Máximo 10MB
              </p>
            </div>

            {/* Ad 2 */}
            <div className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Anúncio 2</h2>
                  <p className="text-sm text-white/60">
                    {adStatus?.ad2.exists ? (
                      <span className="text-green-400">✓ Imagem carregada</span>
                    ) : (
                      <span className="text-yellow-400">⚠ Nenhuma imagem</span>
                    )}
                  </p>
                </div>
                {adStatus?.ad2.exists && adStatus.ad2.path && (
                  <img
                    src={`${adStatus.ad2.path}?v=${imageKey}`}
                    alt="Anúncio 2"
                    className="w-24 h-24 object-contain bg-black rounded-lg border border-white/10"
                    key={`ad2-${imageKey}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <label className="block">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload('ad2', file);
                    }
                  }}
                  disabled={uploading.ad2}
                  className="hidden"
                  id="ad2-upload"
                />
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="ad2-upload"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                      uploading.ad2
                        ? 'border-blue-500/50 bg-blue-500/10 cursor-wait'
                        : 'border-white/20 hover:border-blue-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-blue-400">
                      {uploading.ad2 ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                          <span>Enviando...</span>
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
              <p className="text-xs text-white/40 mt-2">
                PNG, JPEG ou WebP. Máximo 10MB
              </p>
            </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate('/company/dashboard')}
                  className="px-6 py-2.5 bg-transparent text-gray-400 border border-white/20 rounded-lg hover:border-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3 mx-auto text-sm"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Voltar ao Dashboard
                </button>
              </div>
            </div>
          )}
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
            Faça upload das imagens dos anúncios exibidos no modo kiosk
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

        {loading ? (
          <div className="text-center text-white/60 py-12">
            <div className="inline-block animate-spin text-[#D4AF37] text-4xl mb-4">
              <span className="material-symbols-outlined">refresh</span>
            </div>
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ad 1 */}
            <div className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Anúncio 1</h2>
                  <p className="text-sm text-white/60">
                    {adStatus?.ad1.exists ? (
                      <span className="text-green-400">✓ Imagem carregada</span>
                    ) : (
                      <span className="text-yellow-400">⚠ Nenhuma imagem</span>
                    )}
                  </p>
                </div>
                {adStatus?.ad1.exists && adStatus.ad1.path && (
                  <img
                    src={`${adStatus.ad1.path}?v=${imageKey}`}
                    alt="Anúncio 1"
                    className="w-24 h-24 object-contain bg-black rounded-lg border border-[rgba(212,175,55,0.3)]"
                    key={`ad1-${imageKey}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <label className="block">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload('ad1', file);
                    }
                  }}
                  disabled={uploading.ad1}
                  className="hidden"
                  id="ad1-upload"
                />
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="ad1-upload"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                      uploading.ad1
                        ? 'border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.1)] cursor-wait'
                        : 'border-[rgba(212,175,55,0.3)] hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                      {uploading.ad1 ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                          <span>Enviando...</span>
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
              <p className="text-xs text-white/40 mt-2">
                PNG, JPEG ou WebP. Máximo 10MB
              </p>
            </div>

            {/* Ad 2 */}
            <div className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Anúncio 2</h2>
                  <p className="text-sm text-white/60">
                    {adStatus?.ad2.exists ? (
                      <span className="text-green-400">✓ Imagem carregada</span>
                    ) : (
                      <span className="text-yellow-400">⚠ Nenhuma imagem</span>
                    )}
                  </p>
                </div>
                {adStatus?.ad2.exists && adStatus.ad2.path && (
                  <img
                    src={`${adStatus.ad2.path}?v=${imageKey}`}
                    alt="Anúncio 2"
                    className="w-24 h-24 object-contain bg-black rounded-lg border border-[rgba(212,175,55,0.3)]"
                    key={`ad2-${imageKey}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <label className="block">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload('ad2', file);
                    }
                  }}
                  disabled={uploading.ad2}
                  className="hidden"
                  id="ad2-upload"
                />
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="ad2-upload"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                      uploading.ad2
                        ? 'border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.1)] cursor-wait'
                        : 'border-[rgba(212,175,55,0.3)] hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                      {uploading.ad2 ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                          <span>Enviando...</span>
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
              <p className="text-xs text-white/40 mt-2">
                PNG, JPEG ou WebP. Máximo 10MB
              </p>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/company/dashboard')}
                className="px-6 py-2.5 bg-transparent text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.2)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center gap-3 mx-auto text-sm"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

