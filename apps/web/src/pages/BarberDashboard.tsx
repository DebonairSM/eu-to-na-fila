import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLogout } from '@/hooks/useLogout';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { Navigation } from '@/components/Navigation';
import { api } from '@/lib/api';
import { FallingStarRating } from '@/components/FallingStarRating';

const RATINGS_CELEBRATED_KEY = 'eutonafila_barber_ratings_celebrated';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BarberDashboard() {
  const { logoutAndGoHome } = useLogout();
  const { t } = useLocale();
  const shopSlug = useShopSlug();
  const [ratingsSummary, setRatingsSummary] = useState<{
    ratingCountAllTime: number;
    avgRatingAllTime: number | null;
    ratingsToday: { count: number; avg: number | null };
  } | null>(null);
  const [runFallingStars, setRunFallingStars] = useState(false);
  const hasCheckedCelebrationRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shopSlug) return;
      try {
        const data = await api.getBarberAnalytics(shopSlug, 30);
        const ratings = (data as { ratings?: { ratingCountAllTime: number; avgRatingAllTime: number | null; ratingsToday: { count: number; avg: number | null } } }).ratings;
        if (cancelled || !ratings) return;
        setRatingsSummary({
          ratingCountAllTime: ratings.ratingCountAllTime,
          avgRatingAllTime: ratings.avgRatingAllTime,
          ratingsToday: ratings.ratingsToday,
        });
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [shopSlug]);

  useEffect(() => {
    if (!ratingsSummary || hasCheckedCelebrationRef.current) return;
    const todayCount = ratingsSummary.ratingsToday.count;
    if (todayCount === 0) return;
    const key = `${RATINGS_CELEBRATED_KEY}_${getTodayKey()}`;
    const lastCelebrated = parseInt(sessionStorage.getItem(key) ?? '0', 10);
    if (todayCount > lastCelebrated) {
      hasCheckedCelebrationRef.current = true;
      setRunFallingStars(true);
    }
  }, [ratingsSummary]);

  const handleFallingStarsComplete = () => {
    const key = `${RATINGS_CELEBRATED_KEY}_${getTodayKey()}`;
    if (ratingsSummary?.ratingsToday.count != null) {
      sessionStorage.setItem(key, String(ratingsSummary.ratingsToday.count));
    }
    setRunFallingStars(false);
  };

  return (
    <div className="min-h-screen h-full bg-[var(--shop-background)]">
      <Navigation />
      <main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="text-center mb-10">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[var(--shop-accent)]">
            {t('barberDashboard.title')}
          </h1>
        </div>

        {ratingsSummary != null && (ratingsSummary.ratingCountAllTime > 0 || runFallingStars) && (
          <div className="mb-8 rounded-2xl border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-[var(--shop-text-primary)] text-center mb-2">
              {t('barberDashboard.yourRating')}
            </h2>
            {runFallingStars ? (
              <div className="py-4">
                <p className="text-center text-[var(--shop-text-secondary)] text-sm mb-4">
                  {t('barberDashboard.ratingsTodayUpdate')}
                </p>
                <FallingStarRating
                  run={runFallingStars}
                  starCount={ratingsSummary.avgRatingAllTime ?? 0}
                  onComplete={handleFallingStarsComplete}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <span
                      key={value}
                      className={`material-symbols-outlined text-2xl sm:text-3xl ${ratingsSummary.avgRatingAllTime != null && value <= Math.round(ratingsSummary.avgRatingAllTime) ? 'text-[var(--shop-accent)]' : 'text-[var(--shop-text-secondary)] opacity-40'}`}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="text-[var(--shop-text-primary)] font-semibold">
                  {ratingsSummary.avgRatingAllTime != null ? ratingsSummary.avgRatingAllTime.toFixed(1) : '—'} ({ratingsSummary.ratingCountAllTime} {t('analytics.ratings')})
                </p>
                {ratingsSummary.ratingsToday.count > 0 && (
                  <p className="text-sm text-[var(--shop-text-secondary)]">
                    {ratingsSummary.ratingsToday.count} {t('barberDashboard.today')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Link
            to="/manage"
            className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[var(--shop-accent)]">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--shop-text-primary)] text-center">
              {t('barberDashboard.manageQueue')}
            </h2>
            <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/my-stats"
            className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[var(--shop-accent)]">
              <span className="material-symbols-outlined">bar_chart</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--shop-text-primary)] text-center">
              {t('barberDashboard.analytics')}
            </h2>
            <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/clients"
            className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[var(--shop-accent)]">
              <span className="material-symbols-outlined">person_search</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--shop-text-primary)] text-center">
              {t('staff.clients')}
            </h2>
            <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={logoutAndGoHome}
            className="px-5 py-2.5 bg-transparent text-[var(--shop-text-secondary)] border border-[var(--shop-border-color)] rounded-lg hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)] transition-all flex items-center gap-3 mx-auto text-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {t('barberDashboard.logout')}
          </button>
        </div>
      </main>
    </div>
  );
}
