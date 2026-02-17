import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { RootSiteFooter } from '@/components/RootSiteFooter';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/lib/api';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export function PropagandasBuyCompletePage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [orderId, setOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (selected: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(selected);
    if (selected && ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!sessionId) {
      setError(t('propagandas.completeMissingSession'));
      setLoading(false);
      return;
    }
    api
      .getOrderAfterPayment(sessionId)
      .then((res) => {
        setOrderId(res.orderId);
        setError(null);
      })
      .catch(() => setError(t('propagandas.completeError')))
      .finally(() => setLoading(false));
  }, [sessionId, t]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(t('propagandas.invalidImage'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError(t('propagandas.invalidImage'));
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      await api.uploadAdOrderImage(orderId, file);
      setSuccess(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('propagandas.errorOrder'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <RootSiteNav />
        <main className="py-20">
          <Container size="2xl">
            <div className="max-w-xl mx-auto text-center">
              <p className="text-gray-400">{t('common.loading')}</p>
            </div>
          </Container>
        </main>
      </div>
    );
  }

  if (error || !orderId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <RootSiteNav />
        <main className="py-20">
          <Container size="2xl">
            <div className="max-w-xl mx-auto text-center">
              <h1 className="text-2xl font-light mb-4">{t('propagandas.completeError')}</h1>
              <p className="text-gray-400 mb-6">{error}</p>
              <Link
                to="/propagandas/buy"
                className="inline-block px-6 py-2.5 border border-white/20 text-white rounded-lg hover:bg-white/5 text-sm"
              >
                {t('propagandas.backToBuy')}
              </Link>
            </div>
          </Container>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <RootSiteNav />
        <main className="py-20">
          <Container size="2xl">
            <div className="max-w-xl mx-auto text-center">
              <h1 className="text-3xl font-light mb-4">{t('propagandas.successSubmitted')}</h1>
              <p className="text-gray-400 mb-8">{t('propagandas.successSubmittedMessage')}</p>
              <Link
                to="/propagandas"
                className="inline-block px-6 py-2.5 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-all text-sm"
              >
                {t('propagandas.backToPropagandas')}
              </Link>
            </div>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />
      <main className="py-20">
        <Container size="2xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light mb-2">{t('propagandas.uploadImageTitle')}</h1>
            <p className="text-gray-500 text-sm mb-2">{t('propagandas.uploadImageSubtext')}</p>
            <p className="text-xs text-gray-500">{t('propagandas.step2Of2')}</p>
          </header>

          <form onSubmit={handleUpload} className="max-w-xl mx-auto space-y-6">
            {uploadError && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {uploadError}
              </div>
            )}
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="text-xs font-medium text-gray-400 mb-1">{t('propagandas.imageGuidelinesTitle')}</p>
              <p className="text-xs text-gray-500">{t('propagandas.imageGuidelines')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('propagandas.imageLabel')}
              </label>
              <input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">{t('propagandas.imageHint')}</p>
              {file && (
                <p className="text-xs text-gray-400 mt-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            {previewUrl && (
              <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden max-w-sm">
                <img src={previewUrl} alt="" className="w-full h-auto object-contain max-h-64" />
              </div>
            )}
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full px-6 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {uploading ? t('propagandas.submitting') : t('propagandas.uploadImageSubmit')}
            </button>
          </form>
        </Container>
      </main>

      <div className="mt-24">
        <RootSiteFooter />
      </div>
    </div>
  );
}
