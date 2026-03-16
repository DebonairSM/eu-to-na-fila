import { useEffect, useState, useRef, useMemo } from 'react';
import type { CountryCode } from 'libphonenumber-js';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Container, Heading, Text, Card, CardContent, Button, Input, InputLabel } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCustomerProfileAndAppointments } from '@/hooks/useCustomerProfileAndAppointments';
import { useLogout } from '@/hooks/useLogout';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { formatDurationMinutes } from '@/lib/formatDuration';
import { isReferencePresetId, referencePresetIcons, referencePresetLabelKeys } from '@/lib/referencePresets';
import { cn, formatPhoneByCountry, getCountryFlagEmoji, getCountryOptions, getErrorMessage } from '@/lib/utils';
import { REFERENCE_PRESET_IDS, type ReferencePresetId } from '@eutonafila/shared';

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CustomerAccountPage() {
  const shopSlug = useShopSlug();
  const { user, isCustomer } = useAuthContext();
  const { logoutAndGoHome } = useLogout();
  const { t, locale } = useLocale();

  const CUSTOMER_COUNTRY_STORAGE_KEY = 'eutonafila_customer_country';
  const { profile, appointments, isLoading: loading, error, refetch } = useCustomerProfileAndAppointments();

  // Editable profile state (synced from profile when it loads)
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editGender, setEditGender] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [editCountry, setEditCountry] = useState<CountryCode>('BR');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);

  // Preferences state
  const [emailReminders, setEmailReminders] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Reference state
  const [refNote, setRefNote] = useState('');
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [refImageObjectUrl, setRefImageObjectUrl] = useState<string | null>(null);
  const [refSaving, setRefSaving] = useState(false);
  const [refUploading, setRefUploading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [refSavedFeedback, setRefSavedFeedback] = useState(false);
  const [refPresets, setRefPresets] = useState<ReferencePresetId[]>([]);
  const [popularPresets, setPopularPresets] = useState<ReferencePresetId[]>([]);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);

  const [bestTimesSuggestion, setBestTimesSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setEditName(profile.name);
    setEditPhone(profile.phone ?? '');
    const stored = localStorage.getItem(CUSTOMER_COUNTRY_STORAGE_KEY);
    if (stored && /^[A-Z]{2}$/.test(stored)) {
      setEditCountry(stored as CountryCode);
    }
    setEditState(profile.state ?? '');
    setEditCity(profile.city ?? '');
    setEditAddress(profile.address ?? '');
    setEditDateOfBirth(profile.dateOfBirth ?? '');
    setEditGender(profile.gender ?? '');
    setEmailReminders(profile.preferences?.emailReminders ?? true);
    setRefNote(profile.nextServiceNote ?? '');
    setRefImageUrl(profile.nextServiceImageUrl ?? null);
    setRefPresets(profile.nextServicePreset ?? []);
  }, [profile]);

  useEffect(() => {
    if (!shopSlug || !isCustomer) return;
    api.getBestTimes(shopSlug)
      .then((res) => {
        if (res.suggestion) setBestTimesSuggestion(res.suggestion);
      })
      .catch(() => {
        // 401 or 404: do not show block
      });
  }, [shopSlug, isCustomer]);

  useEffect(() => {
    if (!shopSlug || !isCustomer) return;
    api.getPopularReferencePresets(shopSlug)
      .then((res) => {
        const ids = res.presets
          .map((p) => p.preset)
          .filter((preset) => isReferencePresetId(preset));
        setPopularPresets(ids);
      })
      .catch(() => {
        setPopularPresets([]);
      });
  }, [shopSlug, isCustomer]);

  // Create object URL for auth-required reference images (our API); use URL directly for public (Supabase)
  const refObjUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const url = refImageUrl;
    if (!url) {
      if (refObjUrlRef.current) {
        URL.revokeObjectURL(refObjUrlRef.current);
        refObjUrlRef.current = null;
      }
      setRefImageObjectUrl(null);
      return;
    }
    const apiBase = config.apiBase ?? '';
    if (apiBase && url.includes('/auth/customer/me/reference')) {
      const token = sessionStorage.getItem('eutonafila_auth_token') ?? localStorage.getItem('eutonafila_auth_token');
      let cancelled = false;
      fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((r) => r.blob())
        .then((blob) => {
          if (cancelled) return;
          if (refObjUrlRef.current) URL.revokeObjectURL(refObjUrlRef.current);
          const objUrl = URL.createObjectURL(blob);
          refObjUrlRef.current = objUrl;
          setRefImageObjectUrl(objUrl);
        })
        .catch(() => { if (!cancelled) setRefImageObjectUrl(null); });
      return () => {
        cancelled = true;
        if (refObjUrlRef.current) {
          URL.revokeObjectURL(refObjUrlRef.current);
          refObjUrlRef.current = null;
        }
        setRefImageObjectUrl(null);
      };
    }
    setRefImageObjectUrl(url);
    return undefined;
  }, [refImageUrl]);

  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryDropdownOpen]);

  const handleCountryChange = (value: CountryCode) => {
    setEditCountry(value);
    if (editPhone.trim()) {
      setEditPhone(formatPhoneByCountry(editPhone, value));
    }
    localStorage.setItem(CUSTOMER_COUNTRY_STORAGE_KEY, value);
  };

  const handlePhoneChange = (value: string) => {
    setEditPhone(formatPhoneByCountry(value, editCountry));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopSlug) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await api.updateCustomerProfile(shopSlug, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        state: editState.trim() || null,
        city: editCity.trim() || null,
        address: editAddress.trim() || null,
        dateOfBirth: editDateOfBirth.trim() || null,
        gender: editGender.trim() || null,
      });
      await refetch();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(getErrorMessage(err, t('common.error')));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleEmailReminders = async () => {
    if (!shopSlug) return;
    const next = !emailReminders;
    setEmailReminders(next);
    setPrefsSaving(true);
    try {
      await api.updateCustomerProfile(shopSlug, {
        preferences: { emailReminders: next },
      });
      await refetch();
    } catch {
      setEmailReminders(!next);
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleSaveReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopSlug) return;
    setRefSaving(true);
    setRefError(null);
    setRefSavedFeedback(false);
    try {
      await api.updateCustomerProfile(shopSlug, {
        nextServicePreset: refPresets.length > 0 ? refPresets : null,
        nextServiceNote: refNote.trim() || null,
      });
      await refetch();
      setRefSavedFeedback(true);
      setTimeout(() => setRefSavedFeedback(false), 2200);
    } catch (err) {
      setRefError(getErrorMessage(err, t('common.error')));
    } finally {
      setRefSaving(false);
    }
  };

  const handleToggleReferencePreset = (preset: ReferencePresetId) => {
    setRefPresets((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset]
    );
  };

  const orderedReferencePresets = useMemo(() => {
    const popular = popularPresets.filter((p) => REFERENCE_PRESET_IDS.includes(p));
    const remaining = REFERENCE_PRESET_IDS.filter((p) => !popular.includes(p));
    return [...popular, ...remaining];
  }, [popularPresets]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopSlug) return;
    setRefUploading(true);
    setRefError(null);
    try {
      const { url } = await api.uploadClientReferenceImage(shopSlug, file);
      setRefImageUrl(url);
      await api.updateCustomerProfile(shopSlug, { nextServiceImageUrl: url });
      await refetch();
    } catch (err) {
      setRefError(getErrorMessage(err, t('common.error')));
    } finally {
      setRefUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!shopSlug) return;
    setRefSaving(true);
    setRefError(null);
    try {
      await api.updateCustomerProfile(shopSlug, { nextServiceImageUrl: null });
      await refetch();
      setRefImageUrl(null);
    } catch (err) {
      setRefError(getErrorMessage(err, t('common.error')));
    } finally {
      setRefSaving(false);
    }
  };

  if (!isCustomer) {
    const loginUrl = `/shop/login?redirect=${encodeURIComponent('/account')}`;
    const signupUrl = `/shop/signup?redirect=${encodeURIComponent('/account')}`;
    const googleUrl = api.getCustomerGoogleAuthUrl(shopSlug, '/account');

    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
          <div className="max-w-md mx-auto">
            <Card variant="default" className="shadow-lg">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--shop-accent)]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[var(--shop-accent)]">person</span>
                </div>
                <Heading level={2}>{t('account.manageYourAccount')}</Heading>
                <Text variant="secondary">{t('account.loginToManage')}</Text>
                <div className="flex flex-col gap-3 pt-2">
                  <Link
                    to={loginUrl}
                    className="inline-flex items-center justify-center font-semibold rounded-lg min-h-[48px] px-6 py-3 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:bg-[var(--shop-accent-hover)] transition-colors w-full"
                  >
                    {t('nav.login')}
                  </Link>
                  <a
                    href={googleUrl}
                    className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-[var(--shop-border-color)] bg-white/5 px-4 py-3 text-[var(--shop-text-primary)] hover:bg-white/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">mail</span>
                    {t('auth.signInOrCreateWithGoogle')}
                  </a>
                  <Link
                    to={signupUrl}
                    className="text-sm text-[var(--shop-accent)] hover:underline"
                  >
                    {t('account.createAccount')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--shop-background)]">
      <Navigation />
      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Heading level={1}>{t('account.title')}</Heading>
              {profile?.visitCount != null && profile.visitCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-[color-mix(in_srgb,var(--shop-accent)_18%,transparent)] text-[var(--shop-accent)] border border-[color-mix(in_srgb,var(--shop-accent)_40%,transparent)]">
                  {profile.visitCount >= 5 && (
                    <span className="material-symbols-outlined text-base">local_fire_department</span>
                  )}
                  {profile.visitCount >= 5 ? t('account.regularBadge') : t('account.visitCount').replace('{{count}}', String(profile.visitCount))}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={logoutAndGoHome}
              className="inline-flex items-center gap-2 text-[var(--shop-text-secondary)] border-[var(--shop-border-color)] hover:bg-white/5 hover:text-[var(--shop-text-primary)]"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              {t('nav.logout')}
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : error ? (
            <Text variant="secondary">{t('common.error')}</Text>
          ) : (
            <>
              {bestTimesSuggestion && (
                <Card variant="default" className="shadow-lg border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)]">
                  <CardContent className="p-4">
                    <h2 className="text-sm font-semibold text-[var(--shop-text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--shop-accent)] text-lg">schedule</span>
                      {t('account.bestTimeTitle')}
                    </h2>
                    <Text size="sm" className="text-[var(--shop-text-primary)]">
                      {bestTimesSuggestion}
                    </Text>
                  </CardContent>
                </Card>
              )}
              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">person</span>
                    {t('account.profile')}
                  </h2>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <InputLabel htmlFor="profile-name">{t('account.name')}</InputLabel>
                      <Input
                        id="profile-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full mt-1"
                      />
                    </div>
                    <div>
                      <InputLabel>{t('account.email')}</InputLabel>
                      <p className="text-sm text-[var(--shop-text-secondary)] mt-1">
                        {profile?.email ?? user?.username ?? '–'}
                      </p>
                    </div>
                    <div>
                      <InputLabel htmlFor="profile-phone">{t('account.phone')}</InputLabel>
                      <div className="flex gap-2 w-full min-w-0 items-stretch mt-1" ref={countryDropdownRef}>
                        <div className="relative min-w-[56px] flex">
                          <button
                            type="button"
                            id="profile-country"
                            onClick={() => setCountryDropdownOpen((open) => !open)}
                            className="w-full h-[46px] rounded-lg border border-[var(--shop-border-color)] bg-white/5 text-[var(--shop-text-primary)] px-3 flex items-center justify-center text-xl outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)] box-border shrink-0"
                            aria-label={t('join.countryLabel')}
                            aria-expanded={countryDropdownOpen}
                            aria-haspopup="listbox"
                          >
                            {getCountryFlagEmoji(editCountry)}
                          </button>
                          {countryDropdownOpen && (
                            <ul
                              role="listbox"
                              aria-label={t('join.countryLabel')}
                              className="absolute top-full left-0 z-50 mt-1 max-h-[280px] overflow-auto rounded-lg border border-[var(--shop-border-color)] bg-[var(--shop-surface-secondary)] py-1 shadow-lg min-w-[200px]"
                            >
                              {countryOptions.map((country) => (
                                <li
                                  key={country.code}
                                  role="option"
                                  aria-selected={editCountry === country.code}
                                  onClick={() => {
                                    handleCountryChange(country.code);
                                    setCountryDropdownOpen(false);
                                  }}
                                  className={`cursor-pointer px-3 py-2.5 text-left text-sm text-[var(--shop-text-primary)] hover:bg-white/10 ${editCountry === country.code ? 'bg-white/10' : ''}`}
                                >
                                  {getCountryFlagEmoji(country.code)} {country.name} {country.dialCode}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <input
                          id="profile-phone"
                          type="tel"
                          value={editPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder={t('join.phonePlaceholder')}
                          className="min-w-0 flex-1 rounded-lg border border-[var(--shop-border-color)] bg-white/5 px-4 py-3 text-[var(--shop-text-primary)] placeholder:text-[var(--shop-text-secondary)] outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)] h-[46px] box-border"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-[var(--shop-text-secondary)] mt-2 mb-1">{t('account.demographicsHint')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <InputLabel htmlFor="profile-state">{t('account.state')}</InputLabel>
                        <Input
                          id="profile-state"
                          type="text"
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          placeholder={t('account.statePlaceholder')}
                          maxLength={2}
                          className="w-full mt-1"
                        />
                      </div>
                      <div>
                        <InputLabel htmlFor="profile-city">{t('account.city')}</InputLabel>
                        <Input
                          id="profile-city"
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          placeholder={t('account.cityPlaceholder')}
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <InputLabel htmlFor="profile-address">{t('account.address')}</InputLabel>
                      <Input
                        id="profile-address"
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder={t('account.addressPlaceholder')}
                        className="w-full mt-1"
                      />
                    </div>
                    <div>
                      <InputLabel htmlFor="profile-dob">{t('account.dateOfBirth')}</InputLabel>
                      <Input
                        id="profile-dob"
                        type="date"
                        value={editDateOfBirth}
                        onChange={(e) => setEditDateOfBirth(e.target.value)}
                        className="w-full mt-1"
                      />
                    </div>
                    <div>
                      <InputLabel htmlFor="profile-gender">{t('account.gender')}</InputLabel>
                      <select
                        id="profile-gender"
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="select-readable w-full mt-1 px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                      >
                        <option value="">{t('account.genderPlaceholder')}</option>
                        <option value="male">{t('account.genderMale')}</option>
                        <option value="female">{t('account.genderFemale')}</option>
                      </select>
                    </div>
                    {profileError && (
                      <p className="text-sm text-[var(--error)]">{profileError}</p>
                    )}
                    <Button type="submit" disabled={profileSaving}>
                      {profileSaving ? t('account.saving') : profileSaved ? t('account.saved') : t('account.save')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">event</span>
                    {t('account.appointments')}
                  </h2>
                  {appointments?.upcoming && appointments.upcoming.length > 0 ? (
                    <ul className="space-y-3">
                      {appointments.upcoming.map((a) => (
                        <li
                          key={a.id}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg',
                            'bg-white/5 border border-white/10'
                          )}
                        >
                          <div>
                            <p className="font-medium">{a.serviceName ?? t('join.serviceLabel')}</p>
                            <p className="text-sm text-[var(--shop-text-secondary)]">
                              {a.type === 'appointment' && a.scheduledTime
                                ? formatDate(a.scheduledTime)
                                : a.status === 'waiting' || a.status === 'in_progress'
                                  ? `#${a.position} · ${a.estimatedWaitTime != null ? formatDurationMinutes(a.estimatedWaitTime) : '–'}`
                                  : a.ticketNumber ?? `#${a.id}`}
                            </p>
                          </div>
                          <Link
                            to={`/status/${a.id}`}
                            className="text-sm font-medium px-3 py-2 rounded-lg bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:opacity-90"
                          >
                            {a.status === 'pending' ? t('account.checkIn') : t('account.viewStatus')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text variant="secondary">{t('account.noUpcoming')}</Text>
                  )}
                  <Link
                    to="/join"
                    className="inline-flex items-center gap-2 mt-4 text-[var(--shop-accent)] hover:underline"
                  >
                    {t('nav.ctaJoin')}
                  </Link>
                  <span className="mx-2">·</span>
                  <Link
                    to="/schedule"
                    className="inline-flex items-center gap-2 text-[var(--shop-accent)] hover:underline"
                  >
                    {t('checkin.backToSchedule')}
                  </Link>
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">history</span>
                    {t('account.history')}
                  </h2>
                  {appointments?.past && appointments.past.length > 0 ? (
                    <ul className="space-y-2">
                      {appointments.past.slice(0, 10).map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/10 last:border-0 text-sm"
                        >
                          <div>
                            <span className="font-medium">{a.serviceName ?? '–'}</span>
                            {a.barberName && (
                              <span className="text-[var(--shop-text-secondary)] ml-2">
                                {a.barberName}
                              </span>
                            )}
                            {a.shopName && (
                              <span className="text-[var(--shop-text-secondary)] ml-2" title={a.shopSlug ?? undefined}>
                                · {a.shopName}
                              </span>
                            )}
                          </div>
                          <span className="text-[var(--shop-text-secondary)]">
                            {a.completedAt ? formatDate(a.completedAt) : formatDate(a.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text variant="secondary">{t('account.noHistory')}</Text>
                  )}
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">tune</span>
                    {t('account.preferences')}
                  </h2>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailReminders}
                      onChange={handleToggleEmailReminders}
                      disabled={prefsSaving}
                      className="rounded border-[var(--shop-border-color)] bg-white/5 text-[var(--shop-accent)] focus:ring-[var(--shop-accent)]"
                    />
                    <span className="text-sm text-[var(--shop-text-primary)]">{t('account.emailReminders')}</span>
                  </label>
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">image</span>
                    {t('account.referenceForNextService')}
                  </h2>
                  <Text size="sm" variant="secondary" className="mb-4">
                    {t('account.referenceSubtitle')}
                  </Text>
                  <form onSubmit={handleSaveReference} className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--shop-text-secondary)]">{t('account.referencePresetPicker')}</p>
                      <div role="group" aria-label={t('account.referencePresetPicker')} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {orderedReferencePresets.map((presetId) => {
                          const selected = refPresets.includes(presetId);
                          const isPopular = popularPresets.includes(presetId);
                          return (
                            <button
                              key={presetId}
                              type="button"
                              onClick={() => handleToggleReferencePreset(presetId)}
                              className={cn(
                                'relative rounded-xl border p-3 text-left transition-colors',
                                selected
                                  ? 'border-[var(--shop-accent)] bg-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)]'
                                  : 'border-[var(--shop-border-color)] bg-white/5 hover:border-[var(--shop-accent)]'
                              )}
                              aria-pressed={selected}
                            >
                              {isPopular && (
                                <span className="absolute top-1.5 right-1.5 text-[10px] leading-none px-1.5 py-1 rounded-full bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]">
                                  {t('account.referencePopularBadge')}
                                </span>
                              )}
                              <span className="material-symbols-outlined text-[var(--shop-accent)] text-base">
                                {referencePresetIcons[presetId]}
                              </span>
                              <p className="mt-1 text-sm text-[var(--shop-text-primary)]">
                                {t(referencePresetLabelKeys[presetId])}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <textarea
                        value={refNote}
                        onChange={(e) => setRefNote(e.target.value)}
                        placeholder={t('account.referenceNotePlaceholder')}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-white/5 text-[var(--shop-text-primary)] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={refFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleUploadImage}
                        className="hidden"
                      />
                      {refImageObjectUrl || refImageUrl ? (
                        <div className="relative inline-block">
                          <img
                            src={refImageObjectUrl || refImageUrl || ''}
                            alt="Reference"
                            className="max-h-48 rounded-lg border border-white/10 object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            disabled={refSaving}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => refFileInputRef.current?.click()}
                          disabled={refUploading}
                          className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[var(--shop-border-color)] text-[var(--shop-text-secondary)] hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)] transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined">upload</span>
                          {refUploading ? t('common.loading') : t('account.uploadReferenceImage')}
                        </button>
                      )}
                    </div>
                    {refError && (
                      <p className="text-sm text-[var(--error)]">{refError}</p>
                    )}
                    {refSavedFeedback && (
                      <div className="inline-flex items-center gap-2 text-sm text-[var(--shop-accent)]">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        {t('account.referenceSavedFeedback')}
                      </div>
                    )}
                    <Button type="submit" disabled={refSaving}>
                      {refSaving ? t('account.saving') : t('account.save')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}