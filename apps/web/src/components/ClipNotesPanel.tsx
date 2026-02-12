import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage } from '@/lib/utils';
import type { ClientClipNote } from '@/lib/api/clients';

export interface ClipNotesPanelProps {
  shopSlug: string;
  clientId: number;
  onError?: (msg: string) => void;
}

export function ClipNotesPanel({ shopSlug, clientId, onError }: ClipNotesPanelProps) {
  const { t } = useLocale();
  const [notes, setNotes] = useState<ClientClipNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .getClient(shopSlug, clientId)
      .then((res) => {
        if (mounted) {
          setNotes(res.clipNotes);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNote.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    try {
      const created = await api.addClipNote(shopSlug, clientId, trimmed);
      setNotes((prev) => [created, ...prev]);
      setNewNote('');
    } catch (err) {
      onError?.(getErrorMessage(err, t('barber.addCustomerError')));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 text-sm text-[var(--shop-text-secondary)]">
        {t('barber.clipNotes')}...
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-border pb-4 mb-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--shop-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-base">note</span>
          {t('barber.clipNotes')}
        </h4>
        <Link
          to={`/clients/${clientId}`}
          className="text-xs text-[var(--shop-accent)] hover:underline flex items-center gap-0.5"
        >
          {t('barber.viewClient')}
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </Link>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
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
    </div>
  );
}
