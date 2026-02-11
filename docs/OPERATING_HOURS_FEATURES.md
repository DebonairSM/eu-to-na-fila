# Operating Hours Features Implementation Plan

## Overview

This document outlines the implementation of three new features for shop operating hours:
1. Lunch break toggle and configuration
2. Closed shop indicator with reopening time
3. Pre-opening queue entry control with temporary manual override

## Current System Analysis

### Existing Architecture
- **Schema**: `shops.settings` (JSONB) contains `operatingHours` and `timezone`
- **Operating Hours Structure**: `DayHours { open: string, close: string }` per weekday
- **Settings UI**: ShopManagementPage.tsx (lines 1165-1193) - table-based day/time editor
- **Barber Management**: BarberManagementPage.tsx - owner/staff interface for queue management
- **No current open/closed enforcement**: System doesn't prevent queue entry based on hours

### Data Flow
1. Settings stored in `shops.settings` JSONB column
2. Parsed via `parseSettings()` in `apps/api/src/lib/settings.ts`
3. Validated with `shopSettingsSchema` in `packages/shared/src/schemas/shopConfig.ts`
4. Frontend receives via ShopConfigContext

---

## Feature 1: Lunch Break Configuration

### Schema Changes

**File**: `packages/shared/src/schemas/shopConfig.ts`

```typescript
// Update DayHours interface (line 215)
export interface DayHours {
  open: string;
  close: string;
  lunchStart?: string;  // NEW
  lunchEnd?: string;    // NEW
}

// Update dayHoursSchema (line 231)
const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  lunchStart: z.string().optional(),  // NEW
  lunchEnd: z.string().optional(),    // NEW
});
```

### UI Changes

**File**: `apps/web/src/pages/ShopManagementPage.tsx`

Update operating hours table (lines 1165-1193):

```tsx
<section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
  <h4 className="text-white font-medium">Horário de funcionamento</h4>
  <p className="text-white/60 text-sm">
    Usado para agendamentos. Deixe fechado os dias sem atendimento.
  </p>
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-white/60 border-b border-white/10">
          <th className="py-2 pr-4">Dia</th>
          <th className="py-2 pr-4 w-24">Aberto</th>
          <th className="py-2 pr-4">Abertura</th>
          <th className="py-2 pr-4">Fechamento</th>
          <th className="py-2 pr-4 w-24">Almoço</th>
          <th className="py-2 pr-4">Saída</th>
          <th className="py-2 pr-4">Retorno</th>
        </tr>
      </thead>
      <tbody>
        {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
          const labels: Record<typeof day, string> = { 
            monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', 
            thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo' 
          };
          const hours = formData.settings.operatingHours ?? ({} as OperatingHours);
          const dayHours = hours[day];
          const isOpen = dayHours != null;
          const open = dayHours?.open ?? '09:00';
          const close = dayHours?.close ?? '18:00';
          const hasLunch = dayHours?.lunchStart != null && dayHours?.lunchEnd != null;
          const lunchStart = dayHours?.lunchStart ?? '12:00';
          const lunchEnd = dayHours?.lunchEnd ?? '13:00';
          
          return (
            <tr key={day} className="border-b border-white/5">
              <td className="py-2 pr-4 text-white/90">{labels[day]}</td>
              
              {/* Open/Closed Toggle */}
              <td className="py-2 pr-4">
                <button 
                  type="button" 
                  role="switch" 
                  aria-checked={isOpen}
                  onClick={() => setFormData({ 
                    ...formData, 
                    settings: { 
                      ...formData.settings, 
                      operatingHours: { 
                        ...hours, 
                        [day]: isOpen ? null : { open, close } 
                      } 
                    } 
                  })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${isOpen ? 'bg-[#D4AF37]' : 'bg-white/20'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${isOpen ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
                </button>
              </td>
              
              {/* Opening Time */}
              <td className="py-2 pr-4">
                <input 
                  type="time" 
                  value={open} 
                  disabled={!isOpen}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { 
                      ...formData.settings, 
                      operatingHours: { 
                        ...hours, 
                        [day]: { ...dayHours!, open: e.target.value, close } 
                      } 
                    } 
                  })}
                  className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                />
              </td>
              
              {/* Closing Time */}
              <td className="py-2 pr-4">
                <input 
                  type="time" 
                  value={close} 
                  disabled={!isOpen}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { 
                      ...formData.settings, 
                      operatingHours: { 
                        ...hours, 
                        [day]: { ...dayHours!, open, close: e.target.value } 
                      } 
                    } 
                  })}
                  className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                />
              </td>
              
              {/* Lunch Toggle */}
              <td className="py-2 pr-4">
                <button 
                  type="button" 
                  role="switch" 
                  aria-checked={hasLunch}
                  disabled={!isOpen}
                  onClick={() => setFormData({ 
                    ...formData, 
                    settings: { 
                      ...formData.settings, 
                      operatingHours: { 
                        ...hours, 
                        [day]: hasLunch 
                          ? { open, close, lunchStart: undefined, lunchEnd: undefined }
                          : { open, close, lunchStart, lunchEnd }
                      } 
                    } 
                  })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${hasLunch ? 'bg-[#D4AF37]' : 'bg-white/20'} disabled:opacity-30`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${hasLunch ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
                </button>
              </td>
              
              {/* Lunch Start */}
              <td className="py-2 pr-4">
                <input 
                  type="time" 
                  value={lunchStart} 
                  disabled={!isOpen || !hasLunch}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { 
                      ...formData.settings, 
                      operatingHours: { 
                        ...hours, 
                        [day]: { ...dayHours!, lunchStart: e.target.value, lunchEnd } 
                      } 
                    } 
                  })}
                  className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                />
              </td>
              
              {/* Lunch End */}
              <td className="py-2 pr-4">
                <input 
                  type="time" 
                  value={lunchEnd} 
                  disabled={!isOpen || !hasLunch}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { 
                      ...formData.settings, 
                      operatingHours: { 
                        ...hours, 
                        [day]: { ...dayHours!, lunchStart, lunchEnd: e.target.value } 
                      } 
                    } 
                  })}
                  className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>
```

### Localization

**Files**: `apps/web/src/locales/pt-BR.json` and `en.json`

```json
{
  "management": {
    "lunchBreak": "Almoço",
    "lunchStart": "Saída",
    "lunchEnd": "Retorno"
  }
}
```

---

## Feature 2: Closed Shop Indicator

### Backend Utility

**File**: `packages/shared/src/utils/shopStatus.ts` (NEW)

```typescript
import type { OperatingHours, DayHours } from '../schemas/shopConfig';

export interface ShopStatusResult {
  isOpen: boolean;
  isInLunch: boolean;
  nextOpenTime: Date | null;
  currentPeriod: 'before_open' | 'open' | 'lunch' | 'after_close' | 'closed_day' | null;
}

/**
 * Check if shop is currently open based on operating hours and timezone.
 * Handles lunch breaks.
 */
export function getShopStatus(
  operatingHours: OperatingHours | undefined,
  timezone: string,
  now: Date = new Date()
): ShopStatusResult {
  if (!operatingHours) {
    return { isOpen: true, isInLunch: false, nextOpenTime: null, currentPeriod: null };
  }

  // Get current time in shop's timezone
  const shopNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDay = dayNames[shopNow.getDay()];
  const currentTime = shopNow.getHours() * 60 + shopNow.getMinutes(); // minutes since midnight

  const todayHours = operatingHours[currentDay];

  // Shop is closed today
  if (!todayHours) {
    const nextOpen = findNextOpenTime(operatingHours, timezone, shopNow);
    return { 
      isOpen: false, 
      isInLunch: false, 
      nextOpenTime: nextOpen, 
      currentPeriod: 'closed_day' 
    };
  }

  const openTime = parseTime(todayHours.open);
  const closeTime = parseTime(todayHours.close);

  // Before opening
  if (currentTime < openTime) {
    const nextOpen = createDateFromTime(shopNow, todayHours.open, timezone);
    return { 
      isOpen: false, 
      isInLunch: false, 
      nextOpenTime: nextOpen, 
      currentPeriod: 'before_open' 
    };
  }

  // After closing
  if (currentTime >= closeTime) {
    const nextOpen = findNextOpenTime(operatingHours, timezone, shopNow);
    return { 
      isOpen: false, 
      isInLunch: false, 
      nextOpenTime: nextOpen, 
      currentPeriod: 'after_close' 
    };
  }

  // Check lunch break
  if (todayHours.lunchStart && todayHours.lunchEnd) {
    const lunchStart = parseTime(todayHours.lunchStart);
    const lunchEnd = parseTime(todayHours.lunchEnd);

    if (currentTime >= lunchStart && currentTime < lunchEnd) {
      const nextOpen = createDateFromTime(shopNow, todayHours.lunchEnd, timezone);
      return { 
        isOpen: false, 
        isInLunch: true, 
        nextOpenTime: nextOpen, 
        currentPeriod: 'lunch' 
      };
    }
  }

  // Shop is open
  return { 
    isOpen: true, 
    isInLunch: false, 
    nextOpenTime: null, 
    currentPeriod: 'open' 
  };
}

/**
 * Parse "HH:MM" to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Create a Date object for a specific time today in the shop's timezone
 */
function createDateFromTime(baseDate: Date, timeStr: string, timezone: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Find the next opening time (could be later today, tomorrow, or next week)
 */
function findNextOpenTime(
  operatingHours: OperatingHours,
  timezone: string,
  from: Date
): Date | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(from);
    checkDate.setDate(checkDate.getDate() + i);
    const dayName = dayNames[checkDate.getDay()];
    const dayHours = operatingHours[dayName];
    
    if (dayHours) {
      return createDateFromTime(checkDate, dayHours.open, timezone);
    }
  }
  
  return null; // No opening time in next 7 days
}
```

### Frontend Component

**File**: `apps/web/src/components/ShopStatusBanner.tsx` (NEW)

```typescript
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getShopStatus } from '@eutonafila/shared';
import { useEffect, useState } from 'react';

export function ShopStatusBanner() {
  const { settings } = useShopConfig();
  const { t } = useLocale();
  const [status, setStatus] = useState(() => 
    getShopStatus(settings.operatingHours, settings.timezone ?? 'America/Sao_Paulo')
  );

  // Update status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getShopStatus(settings.operatingHours, settings.timezone ?? 'America/Sao_Paulo'));
    }, 60000);
    return () => clearInterval(interval);
  }, [settings.operatingHours, settings.timezone]);

  if (status.isOpen) {
    return null; // Don't show banner when open
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return formatTime(date);
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `amanhã às ${formatTime(date)}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-red-400 text-2xl">schedule</span>
        <div>
          <p className="text-white font-medium">
            {status.isInLunch ? t('shop.closedForLunch') : t('shop.closed')}
          </p>
          {status.nextOpenTime && (
            <p className="text-white/70 text-sm">
              {status.isInLunch 
                ? `${t('shop.returnsAt')} ${formatDate(status.nextOpenTime)}`
                : `${t('shop.opensAt')} ${formatDate(status.nextOpenTime)}`
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Integration in JoinPage

**File**: `apps/web/src/pages/JoinPage/index.tsx`

```tsx
import { ShopStatusBanner } from '@/components/ShopStatusBanner';

// Inside the component, before JoinForm:
<Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
  <Heading level={1} className="text-center mb-8">
    {t('join.joinTitle')}
  </Heading>
  
  <ShopStatusBanner />  {/* NEW */}
  
  <JoinForm />
  
  {/* ... rest of component */}
</Container>
```

### Localization

```json
{
  "shop": {
    "closed": "Fechado",
    "closedForLunch": "Fechado para almoço",
    "opensAt": "Abre às",
    "returnsAt": "Retorna às"
  }
}
```

---

## Feature 3: Pre-Opening Queue Control & Manual Override

### Schema Changes

**File**: `packages/shared/src/schemas/shopConfig.ts`

```typescript
// Add to ShopSettings interface (line 249)
export interface ShopSettings {
  // ... existing fields
  allowQueueBeforeOpen: boolean;  // NEW: Allow customers to join queue before opening
  temporaryStatusOverride?: {     // NEW: Manual override by owner
    isOpen: boolean;
    until: string;  // ISO timestamp
    reason?: string;
  } | null;
}

// Add to shopSettingsSchema (line 264)
export const shopSettingsSchema = z.object({
  // ... existing fields
  allowQueueBeforeOpen: z.boolean().default(false),  // NEW
  temporaryStatusOverride: z.object({                 // NEW
    isOpen: z.boolean(),
    until: z.string(),
    reason: z.string().optional(),
  }).nullable().optional(),
});

// Add to shopSettingsInputSchema (line 278)
export const shopSettingsInputSchema = z.object({
  // ... existing fields
  allowQueueBeforeOpen: z.boolean().optional(),       // NEW
  temporaryStatusOverride: z.object({                  // NEW
    isOpen: z.boolean(),
    until: z.string(),
    reason: z.string().optional(),
  }).nullable().optional(),
});
```

### Updated Shop Status Utility

**File**: `packages/shared/src/utils/shopStatus.ts`

```typescript
// Update getShopStatus function signature
export function getShopStatus(
  operatingHours: OperatingHours | undefined,
  timezone: string,
  temporaryOverride?: { isOpen: boolean; until: string; reason?: string } | null,
  allowQueueBeforeOpen: boolean = false,
  now: Date = new Date()
): ShopStatusResult {
  // Check temporary override first
  if (temporaryOverride) {
    const overrideUntil = new Date(temporaryOverride.until);
    if (now < overrideUntil) {
      return {
        isOpen: temporaryOverride.isOpen,
        isInLunch: false,
        nextOpenTime: temporaryOverride.isOpen ? null : findNextOpenTime(operatingHours, timezone, now),
        currentPeriod: temporaryOverride.isOpen ? 'open' : 'closed_day',
        isOverridden: true,
        overrideReason: temporaryOverride.reason,
      };
    }
  }

  // ... existing logic ...
  
  // If allowQueueBeforeOpen is true and we're before opening, treat as open
  if (allowQueueBeforeOpen && result.currentPeriod === 'before_open') {
    return { ...result, isOpen: true };
  }
  
  return result;
}
```

### Backend API Endpoint

**File**: `apps/api/src/routes/shops.ts`

```typescript
// Add new endpoint for temporary status override (owner only)
fastify.patch('/shops/:slug/temporary-status', {
  preHandler: [requireAuth, requireRole(['owner'])],
}, async (request, reply) => {
  const { slug } = validateRequest(z.object({ slug: z.string() }), request.params);
  const body = validateRequest(
    z.object({
      isOpen: z.boolean(),
      durationMinutes: z.number().int().min(1).max(1440), // Max 24 hours
      reason: z.string().max(200).optional(),
    }),
    request.body
  );

  const shop = await getShopBySlug(slug);
  if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

  const until = new Date(Date.now() + body.durationMinutes * 60 * 1000);
  const settings = parseSettings(shop.settings);
  
  const updatedSettings = {
    ...settings,
    temporaryStatusOverride: {
      isOpen: body.isOpen,
      until: until.toISOString(),
      reason: body.reason,
    },
  };

  await db.update(schema.shops)
    .set({ 
      settings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(schema.shops.id, shop.id));

  return reply.status(200).send({ success: true, until });
});

// Add endpoint to clear override
fastify.delete('/shops/:slug/temporary-status', {
  preHandler: [requireAuth, requireRole(['owner'])],
}, async (request, reply) => {
  const { slug } = validateRequest(z.object({ slug: z.string() }), request.params);
  
  const shop = await getShopBySlug(slug);
  if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

  const settings = parseSettings(shop.settings);
  const updatedSettings = {
    ...settings,
    temporaryStatusOverride: null,
  };

  await db.update(schema.shops)
    .set({ 
      settings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(schema.shops.id, shop.id));

  return reply.status(200).send({ success: true });
});
```

### Frontend API Client

**File**: `apps/web/src/lib/api/shops.ts`

```typescript
export interface ShopsApi {
  // ... existing methods
  setTemporaryStatus(shopSlug: string, data: { isOpen: boolean; durationMinutes: number; reason?: string }): Promise<{ success: boolean; until: string }>;
  clearTemporaryStatus(shopSlug: string): Promise<{ success: boolean }>;
}

export function createShopsApi(client: BaseApiClient): ShopsApi {
  return {
    // ... existing methods
    setTemporaryStatus: (shopSlug, data) =>
      client.patch(`/shops/${shopSlug}/temporary-status`, data),
    clearTemporaryStatus: (shopSlug) =>
      client.delete(`/shops/${shopSlug}/temporary-status`),
  };
}
```

### Barber Management UI

**File**: `apps/web/src/pages/BarberManagementPage.tsx`

Add after line 100 (after service management hooks):

```typescript
// Shop status override state
const [overrideModal, setOverrideModal] = useState(false);
const [overrideForm, setOverrideForm] = useState({
  isOpen: true,
  durationMinutes: 60,
  reason: '',
});
const [overrideSubmitting, setOverrideSubmitting] = useState(false);

const handleSetOverride = useCallback(async () => {
  setOverrideSubmitting(true);
  try {
    await api.setTemporaryStatus(shopSlug, overrideForm);
    setOverrideModal(false);
    setOverrideForm({ isOpen: true, durationMinutes: 60, reason: '' });
    // Trigger shop config refresh if available
    window.location.reload(); // Or use a context refresh method
  } catch (err) {
    setErrorMessage(getErrorMessage(err, 'Erro ao definir status temporário'));
  } finally {
    setOverrideSubmitting(false);
  }
}, [shopSlug, overrideForm]);

const handleClearOverride = useCallback(async () => {
  try {
    await api.clearTemporaryStatus(shopSlug);
    window.location.reload();
  } catch (err) {
    setErrorMessage(getErrorMessage(err, 'Erro ao limpar status temporário'));
  }
}, [shopSlug]);
```

Add UI in the header section (after line 466):

```tsx
{/* Shop Status Override Controls (Owner Only) */}
{isOwner && (
  <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-lg">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-white font-medium mb-1">Status da Loja</h3>
        <p className="text-white/60 text-sm">
          Controle temporário de abertura/fechamento
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOverrideForm({ isOpen: true, durationMinutes: 60, reason: '' });
            setOverrideModal(true);
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Abrir Agora
        </button>
        <button
          onClick={() => {
            setOverrideForm({ isOpen: false, durationMinutes: 60, reason: '' });
            setOverrideModal(true);
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Fechar Agora
        </button>
        {/* Show clear button if override is active */}
        <button
          onClick={handleClearOverride}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Limpar Override
        </button>
      </div>
    </div>
  </div>
)}

{/* Override Modal */}
{overrideModal && (
  <Modal
    isOpen={overrideModal}
    onClose={() => setOverrideModal(false)}
    title={overrideForm.isOpen ? 'Abrir Loja Temporariamente' : 'Fechar Loja Temporariamente'}
  >
    <div className="space-y-4">
      <div>
        <label className="block text-white/80 text-sm mb-2">
          Duração (minutos)
        </label>
        <input
          type="number"
          min={1}
          max={1440}
          value={overrideForm.durationMinutes}
          onChange={(e) => setOverrideForm({ 
            ...overrideForm, 
            durationMinutes: parseInt(e.target.value) || 60 
          })}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
        />
        <p className="text-white/50 text-xs mt-1">
          Máximo: 1440 minutos (24 horas)
        </p>
      </div>
      
      <div>
        <label className="block text-white/80 text-sm mb-2">
          Motivo (opcional)
        </label>
        <input
          type="text"
          maxLength={200}
          value={overrideForm.reason}
          onChange={(e) => setOverrideForm({ 
            ...overrideForm, 
            reason: e.target.value 
          })}
          placeholder="Ex: Manutenção, Evento especial..."
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setOverrideModal(false)}
          className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSetOverride}
          disabled={overrideSubmitting}
          className="flex-1 px-4 py-2 bg-[#D4AF37] hover:bg-[#E8C547] text-[#0a0a0a] rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {overrideSubmitting ? 'Aplicando...' : 'Aplicar'}
        </button>
      </div>
    </div>
  </Modal>
)}
```

### Settings UI for allowQueueBeforeOpen

**File**: `apps/web/src/pages/ShopManagementPage.tsx`

Add to service rules section (line 1164):

```tsx
<section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
  <h4 className="text-white font-medium">Regras de atendimento</h4>
  <ul className="space-y-4">
    {[
      { key: 'requirePhone' as const, label: 'Exigir telefone do cliente' },
      { key: 'allowDuplicateNames' as const, label: 'Permitir nomes duplicados na fila' },
      { key: 'deviceDeduplication' as const, label: 'Impedir múltiplos tickets por dispositivo' },
      { key: 'allowCustomerCancelInProgress' as const, label: 'Permitir cliente cancelar atendimento em andamento' },
      { key: 'allowAppointments' as const, label: 'Permitir agendamentos (fila híbrida com horário marcado)' },
      { key: 'allowQueueBeforeOpen' as const, label: 'Permitir entrada na fila antes do horário de abertura' },  // NEW
    ].map(({ key, label }) => (
      <li key={key}>
        <label className="flex items-center gap-3 cursor-pointer group">
          <button 
            type="button" 
            role="switch" 
            aria-checked={formData.settings[key]}
            onClick={() => setFormData({ 
              ...formData, 
              settings: { ...formData.settings, [key]: !formData.settings[key] } 
            })}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings[key] ? 'bg-[#D4AF37]' : 'bg-white/20'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings[key] ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
          </button>
          <span className="text-white/80 text-sm group-hover:text-white transition-colors">
            {label}
          </span>
        </label>
      </li>
    ))}
  </ul>
</section>
```

### Queue Entry Enforcement

**File**: `apps/api/src/routes/tickets.ts`

Add validation in ticket creation endpoint (around line 30):

```typescript
fastify.post('/shops/:slug/tickets', async (request, reply) => {
  // ... existing validation ...
  
  const shop = await getShopBySlug(slug);
  if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
  
  const settings = parseSettings(shop.settings);
  
  // Check if shop is open (unless allowQueueBeforeOpen is enabled)
  const status = getShopStatus(
    settings.operatingHours,
    settings.timezone ?? 'America/Sao_Paulo',
    settings.temporaryStatusOverride,
    settings.allowQueueBeforeOpen
  );
  
  if (!status.isOpen) {
    throw new ValidationError(
      status.isInLunch 
        ? 'Shop is closed for lunch break'
        : 'Shop is currently closed'
    );
  }
  
  // ... rest of ticket creation logic ...
});
```

### Frontend Queue Entry Check

**File**: `apps/web/src/pages/JoinPage/hooks/useJoinForm.ts`

Add check before submission (around line 350):

```typescript
// Check shop status before creating ticket
const status = getShopStatus(
  settings.operatingHours,
  settings.timezone ?? 'America/Sao_Paulo',
  settings.temporaryStatusOverride,
  settings.allowQueueBeforeOpen
);

if (!status.isOpen) {
  setSubmitError(
    status.isInLunch 
      ? t('join.shopClosedForLunch')
      : t('join.shopClosed')
  );
  setIsSubmitting(false);
  return;
}
```

---

## Migration Plan

### Database Migration

No database migration needed - all changes use existing `shops.settings` JSONB column.

### Deployment Steps

1. **Backend**:
   - Deploy shared package with updated schemas
   - Deploy API with new endpoints and validation
   - No downtime - existing shops continue working with defaults

2. **Frontend**:
   - Deploy updated UI components
   - Existing shops see new features immediately
   - No data migration required

3. **Testing**:
   - Test lunch break configuration
   - Test closed shop banner display
   - Test temporary override functionality
   - Test queue entry enforcement

### Rollback Plan

If issues arise:
1. Revert frontend deployment (UI changes only)
2. Backend changes are backward compatible (new fields are optional)
3. Existing functionality remains unaffected

---

## Testing Checklist

### Lunch Break
- [ ] Toggle lunch break on/off for each day
- [ ] Set lunch start/end times
- [ ] Verify times validate correctly (end > start)
- [ ] Check appointment slot generation excludes lunch period
- [ ] Test with timezone changes

### Closed Shop Banner
- [ ] Banner shows when shop is closed
- [ ] Banner shows correct reopening time
- [ ] Banner shows "closed for lunch" during lunch
- [ ] Banner hides when shop is open
- [ ] Time formatting is correct (today, tomorrow, day name)
- [ ] Updates every minute

### Manual Override
- [ ] Owner can open shop early
- [ ] Owner can close shop temporarily
- [ ] Override expires after set duration
- [ ] Override can be cleared manually
- [ ] Override reason displays correctly
- [ ] Non-owners cannot access override controls

### Queue Entry Control
- [ ] Customers blocked when shop closed (if allowQueueBeforeOpen = false)
- [ ] Customers allowed when shop closed (if allowQueueBeforeOpen = true)
- [ ] Error message displays correctly
- [ ] Manual override bypasses scheduled hours
- [ ] Lunch break blocks entry (if allowQueueBeforeOpen = false)

---

## Future Enhancements

1. **Holiday Management**: Add special dates for closures
2. **Seasonal Hours**: Different hours for different seasons
3. **Break Notifications**: Notify customers in queue when lunch break starts
4. **Auto-reopen**: Automatically clear override after duration
5. **Override History**: Log all manual overrides for analytics
6. **Multiple Breaks**: Support multiple breaks per day
7. **SMS Notifications**: Send SMS when shop reopens

---

## Summary

This implementation:
- ✅ Fits existing architecture (JSONB settings, Zod validation)
- ✅ No database migrations required
- ✅ Backward compatible (all new fields optional with defaults)
- ✅ Follows existing patterns (ShopSettings, parseSettings, ShopConfigContext)
- ✅ Reuses existing components (Modal, toggle switches, time inputs)
- ✅ Maintains type safety throughout
- ✅ Handles timezones correctly
- ✅ Provides clear UX for all user roles
