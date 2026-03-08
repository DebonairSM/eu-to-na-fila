import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useLocale } from '@/contexts/LocaleContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getErrorMessage } from '@/lib/utils';
import type { ClientClipNote } from '@/lib/api/clients';

export type ServiceHistoryItem = { id: number; serviceName: string; barberName: string | null; completedAt: string | null };

/** Service option for grouping notes into sections (e.g. from ticket's complementary services). */
export type ClipNotesService = { id: number; name: string };

export interface ClipNotesPanelProps {
  shopSlug: string;
  clientId: number;
  onError?: (msg: string) => void;
  /** When false, hide the "View client" link (e.g. for barbers who must not see full profile). */
  canViewFullClient?: boolean;
  /** When false, hide the add-note form (e.g. in barber selector; use "See previous notes" during service to add). */
  canAddNote?: boolean;
  /** When set, notes are shown in one section per service (plus General for notes without a service). */
  services?: ClipNotesService[];
  /** When set (e.g. post-complete flow), attribute new notes to this barber; required when caller is staff/owner. */
  barberIdForNote?: number;
}

export function ClipNotesPanel({ shopSlug, clientId, onError, canViewFullClient = true, canAddNote = true, services = [], barberIdForNote }: ClipNotesPanelProps) {
  const { t } = useLocale();
  const [notes, setNotes] = useState<ClientClipNote[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([]);
  const [clientCity, setClientCity] = useState<string | null>(null);
  const [clientNextServiceNote, setClientNextServiceNote] = useState<string | null>(null);
  const [clientNextServiceImageUrl, setClientNextServiceImageUrl] = useState<string | null>(null);
  const [refImageDisplayUrl, setRefImageDisplayUrl] = useState<string | null>(null);
  const refImageObjUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newNoteBySection, setNewNoteBySection] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [addingForSection, setAddingForSection] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getClient(shopSlug, clientId)
      .then((res) => {
        if (mounted) {
          setNotes(res.clipNotes);
          setServiceHistory(res.serviceHistory ?? []);
          setClientCity(res.client?.city ?? null);
          setClientNextServiceNote(res.client?.nextServiceNote ?? null);
          setClientNextServiceImageUrl(res.client?.nextServiceImageUrl ?? null);
        }
      })
      .catch((err) => {
        if (mounted && onError) {
          onError(getErrorMessage(err, t('barber.addCustomerError')));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [shopSlug, clientId, onError, t]);

  // Resolve reference image URL for staff (customer auth route requires staff endpoint)
  useEffect(() => {
    const url = clientNextServiceImageUrl;
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
  }, [clientNextServiceImageUrl, shopSlug, clientId]);

  const handleAdd = async (e: React.FormEvent, serviceId?: number | null) => {
    e.preventDefault();
    const isSectioned = services.length > 0;
    const sectionKey = serviceId == null ? 'general' : String(serviceId);
    const text = isSectioned ? (newNoteBySection[sectionKey] ?? '').trim() : newNote.trim();
    if (!text || (isSectioned ? addingForSection !== null : adding)) return;

    if (isSectioned) setAddingForSection(sectionKey);
    else setAdding(true);
    try {
      const created = await api.addClipNote(shopSlug, clientId, text, serviceId ?? undefined, barberIdForNote);
      setNotes((prev) => [created, ...prev]);
      if (isSectioned) {
        setNewNoteBySection((prev) => ({ ...prev, [sectionKey]: '' }));
      } else {
        setNewNote('');
      }
    } catch (err) {
      onError?.(getErrorMessage(err, t('barber.addCustomerError')));
    } finally {
      if (isSectioned) setAddingForSection(null);
      else setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <LoadingSpinner size="sm" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-border pb-4 mb-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--shop-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-base">note</span>
          {t('barber.clipNotes')}
          {clientCity && (
            <span className="text-xs font-normal text-[var(--shop-text-secondary)]">· {clientCity}</span>
          )}
        </h4>
        {canViewFullClient && (
          <Link
            to={`/clients/${clientId}`}
            className="text-xs text-[var(--shop-accent)] hover:underline flex items-center gap-0.5"
          >
            {t('barber.viewClient')}
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </Link>
        )}
      </div>
      {(clientNextServiceNote || clientNextServiceImageUrl || refImageDisplayUrl) && (
        <div className="rounded-lg border border-border p-3 bg-muted/20">
          <h5 className="text-sm font-medium text-[var(--shop-text-primary)] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">person</span>
            {t('barber.clientReference')}
          </h5>
          {clientNextServiceNote && (
            <p className="text-sm text-[var(--shop-text-primary)] whitespace-pre-wrap mb-2">{clientNextServiceNote}</p>
          )}
          {refImageDisplayUrl && (
            <img
              src={refImageDisplayUrl}
              alt=""
              className="max-h-48 rounded-lg border border-border object-cover"
            />
          )}
        </div>
      )}
      {services.length > 0 ? (
        <div className="space-y-4">
          {services.map((s) => ({ key: String(s.id), title: s.name, serviceId: s.id })).map(({ key, title, serviceId }) => {
            const sectionNotes = notes.filter((n) => n.serviceId === serviceId);
            const sectionNoteValue = newNoteBySection[key] ?? '';
            const isAdding = addingForSection === key;
            return (
              <div key={key} className="border border-border rounded-lg p-3 bg-muted/20">
                <h5 className="text-sm font-medium text-[var(--shop-text-primary)] mb-2">{title}</h5>
                {canAddNote && (
                  <form onSubmit={(e) => handleAdd(e, serviceId ?? undefined)} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={sectionNoteValue}
                      onChange={(e) => setNewNoteBySection((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={t('barber.clipNotePlaceholder')}
                      maxLength={2000}
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isAdding}
                    />
                    <button
                      type="submit"
                      disabled={isAdding || !sectionNoteValue.trim()}
                      className="px-3 py-2 rounded-lg bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAdding ? '...' : t('barber.addClipNote')}
                    </button>
                  </form>
                )}
                <ul className="space-y-2 max-h-28 overflow-y-auto">
                  {sectionNotes.length === 0 ? (
                    <li className="text-sm text-[var(--shop-text-secondary)] italic">{t('barber.clipNotesEmpty')}</li>
                  ) : (
                    sectionNotes.map((n) => (
                      <li
                        key={n.id}
                        className="text-sm py-1.5 px-2 rounded bg-white/5 border border-white/5 text-[var(--shop-text-primary)]"
                      >
                        <p>{n.note}</p>
                        <span className="text-xs text-[var(--shop-text-secondary)]">
                          {n.barber?.name ?? ''} · {new Date(n.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {canAddNote && (
            <form onSubmit={(e) => handleAdd(e)} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('barber.clipNotePlaceholder')}
                maxLength={2000}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newNote.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? '...' : t('barber.addClipNote')}
              </button>
            </form>
          )}
          <ul className="space-y-2 max-h-32 overflow-y-auto">
            {notes.length === 0 ? (
              <li className="text-sm text-[var(--shop-text-secondary)] italic">{t('barber.clipNotesEmpty')}</li>
            ) : (
              notes.map((n) => (
                <li
                  key={n.id}
                  className="text-sm py-1.5 px-2 rounded bg-white/5 border border-white/5 text-[var(--shop-text-primary)]"
                >
                  <p>{n.note}</p>
                  <span className="text-xs text-[var(--shop-text-secondary)]">
                    {n.barber?.name ?? ''} · {new Date(n.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </>
      )}
      {serviceHistory.length > 0 && (
        <div className="pt-3 border-t border-border">
          <h4 className="text-sm font-medium text-[var(--shop-text-primary)] flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base">history</span>
            {t('barber.serviceHistory')}
          </h4>
          <ul className="space-y-1.5 max-h-28 overflow-y-auto">
            {serviceHistory.map((s) => (
              <li
                key={s.id}
                className="text-sm py-1.5 px-2 rounded bg-white/5 border border-white/5 flex justify-between items-center gap-2"
              >
                <span className="text-[var(--shop-text-primary)]">{s.serviceName}</span>
                {s.completedAt && (
                  <span className="text-xs text-[var(--shop-text-secondary)] shrink-0">
                    {new Date(s.completedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
