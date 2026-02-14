import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { formatNameForDisplay } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils';
import type { ClientDetailResponse } from '@/lib/api/clients';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { t } = useLocale();
  const [data, setData] = useState<ClientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const clientId = id ? parseInt(id, 10) : null;

  // Resolve reference image URL: staff route for auth-required images
  const [refImageDisplayUrl, setRefImageDisplayUrl] = useState<string | null>(null);
  const refImageObjUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const url = data?.client?.nextServiceImageUrl;
    if (!url || !shopSlug || !clientId) {
      if (refImageObjUrlRef.current) {
        URL.revokeObjectURL(refImageObjUrlRef.current);
        refImageObjUrlRef.current = null;
      }
      setRefImageDisplayUrl(null);
      return;
    }
    if (url.includes('/auth/customer/me/reference')) {
      const staffUrl = `${config.apiBase}/shops/${encodeURIComponent(shopSlug)}/clients/${clientId}/reference-image`;
      const token = sessionStorage.getItem('eutonafila_auth_token') ?? localStorage.getItem('eutonafila_auth_token');
      let cancelled = false;
      fetch(staffUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((r) => r.blob())
        .then((blob) => {
          if (cancelled) return;
          if (refImageObjUrlRef.current) URL.revokeObjectURL(refImageObjUrlRef.current);
          const objUrl = URL.createObjectURL(blob);
          refImageObjUrlRef.current = objUrl;
          setRefImageDisplayUrl(objUrl);
        })
        .catch(() => { if (!cancelled) setRefImageDisplayUrl(null); });
      return () => {
        cancelled = true;
        if (refImageObjUrlRef.current) {
          URL.revokeObjectURL(refImageObjUrlRef.current);
          refImageObjUrlRef.current = null;
        }
        setRefImageDisplayUrl(null);
      };
    }
    setRefImageDisplayUrl(url);
    return undefined;
  }, [data?.client?.nextServiceImageUrl, shopSlug, clientId]);

  const fetchClient = useCallback(() => {
    if (!shopSlug || !clientId || isNaN(clientId)) return;
    setLoading(true);
    setError(null);
    api
      .getClient(shopSlug, clientId)
      .then((res) => {
        setData(res);
        const c = res.client as { name?: string; email?: string | null };
        if (c.name != null) {
          setEditName(c.name);
          setEditEmail(c.email ?? '');
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load client'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shopSlug, clientId]);

  useEffect(() => {
    if (!shopSlug || !clientId || isNaN(clientId)) {
      setLoading(false);
      setError('Invalid client');
      return;
    }
    fetchClient();
  }, [shopSlug, clientId, fetchClient]);

  const startEdit = () => {
    if (data) {
      setEditName(data.client.name);
      setEditEmail(data.client.email ?? '');
      setEditing(true);
      setSaveError(null);
      setSaveSuccess(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!shopSlug || !clientId || !data) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await api.updateClient(shopSlug, clientId, {
        name: editName.trim() || undefined,
        email: editEmail.trim() || null,
      });
      setData({
        ...data,
        client: {
          ...data.client,
          name: updated.name,
          email: updated.email,
        },
      });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(getErrorMessage(err, t('clients.saveError')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container max-w-2xl mx-auto pt-24 px-4">
          <p className="text-[var(--shop-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container max-w-2xl mx-auto pt-24 px-4">
          <p className="text-red-400">{error ?? 'Client not found'}</p>
          <Button variant="outline" onClick={() => navigate('/manage')} className="mt-4">
            Back to queue
          </Button>
        </div>
      </div>
    );
  }

  const { client, clipNotes, serviceHistory } = data;
  const isBarberView = client.name == null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="container max-w-2xl mx-auto pt-24 px-4 pb-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-2 text-[var(--shop-text-secondary)] hover:text-white">
          <span className="material-symbols-outlined mr-1 align-middle">arrow_back</span>
          {t('common.back')}
        </Button>

        {isBarberView && (
          <p className="text-[var(--shop-text-secondary)] text-sm mb-4">
            {t('clients.barberViewOnlyNotesAndHistory')}
          </p>
        )}

        <div className="space-y-6">
          {!isBarberView && (
            <section className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                {editing ? (
                  <div className="flex-1 min-w-0 space-y-2">
                    <label className="block text-sm text-[var(--shop-text-secondary)]">{t('clients.editName')}</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--shop-accent)] text-[var(--shop-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                      maxLength={200}
                    />
                    <label className="block text-sm text-[var(--shop-text-secondary)]">{t('clients.editEmail')}</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--shop-accent)] text-[var(--shop-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={handleSave}
                        disabled={saving || !editName.trim()}
                        className="bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:opacity-90"
                      >
                        {saving ? '...' : t('clients.save')}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                        {t('clients.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold text-[var(--shop-accent)]">{formatNameForDisplay(client.name)}</h1>
                    <Button variant="ghost" size="sm" onClick={startEdit} className="text-[var(--shop-text-secondary)] hover:text-white">
                      <span className="material-symbols-outlined mr-1 align-middle text-lg">edit</span>
                      {t('clients.edit')}
                    </Button>
                  </>
                )}
              </div>
              {saveError && <p className="text-red-400 text-sm mt-2">{saveError}</p>}
              {saveSuccess && <p className="text-green-400 text-sm mt-2">{t('clients.saveSuccess')}</p>}
              {!editing && (
                <>
                  <p className="text-[var(--shop-text-secondary)]">{client.phone}</p>
                  {client.email && <p className="text-[var(--shop-text-secondary)] text-sm mt-1">{client.email}</p>}
                </>
              )}
            </section>
          )}

          {!isBarberView && (client.nextServiceNote || client.nextServiceImageUrl) && (
            <section className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--shop-accent)]">image</span>
                {t('account.referenceForNextService')}
              </h2>
              {client.nextServiceNote && (
                <p className="text-white whitespace-pre-wrap mb-3">{client.nextServiceNote}</p>
              )}
              {(refImageDisplayUrl || client.nextServiceImageUrl) && (
                <img
                  src={refImageDisplayUrl || client.nextServiceImageUrl || ''}
                  alt="Reference"
                  className="max-h-64 rounded-lg border border-white/10 object-cover"
                />
              )}
            </section>
          )}

          <section className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--shop-accent)]">note</span>
              {t('barber.clipNotes')}
            </h2>
            {clipNotes.length === 0 ? (
              <p className="text-[var(--shop-text-secondary)] italic">{t('barber.clipNotesEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {clipNotes.map((n) => (
                  <li
                    key={n.id}
                    className="py-3 px-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <p className="text-white">{n.note}</p>
                    <span className="text-xs text-[var(--shop-text-secondary)] mt-1 block">
                      {n.barber?.name ?? ''} · {new Date(n.createdAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--shop-accent)]">history</span>
              {t('barber.serviceHistory')}
            </h2>
            {serviceHistory.length === 0 ? (
              <p className="text-[var(--shop-text-secondary)] italic">No completed services yet</p>
            ) : (
              <ul className="space-y-3">
                {serviceHistory.map((s) => (
                  <li
                    key={s.id}
                    className="py-3 px-4 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-medium">{s.serviceName}</p>
                      {s.barberName && (
                        <p className="text-sm text-[var(--shop-text-secondary)]">{s.barberName}</p>
                      )}
                    </div>
                    {s.completedAt && (
                      <span className="text-xs text-[var(--shop-text-secondary)]">
                        {new Date(s.completedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
