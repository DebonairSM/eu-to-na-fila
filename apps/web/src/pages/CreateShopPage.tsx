import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useModal } from '@/hooks/useModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { isRootBuild } from '@/lib/build';
import { getErrorMessage } from '@/lib/utils';

// --- Types ---

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface BarberItem {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ShopFormData {
  name: string;
  slug: string;
  domain: string;
  themePrimary: string;
  themeAccent: string;
  ownerPin: string;
  staffPin: string;
  services: ServiceItem[];
  barbers: BarberItem[];
}

// --- Template ---

const uid = () => Math.random().toString(36).substring(2, 9);

const TEMPLATE: ShopFormData = {
  name: '',
  slug: '',
  domain: '',
  themePrimary: '#3E2723',
  themeAccent: '#FFD54F',
  ownerPin: '',
  staffPin: '',
  services: [
    { id: uid(), name: 'Corte de Cabelo', description: 'Corte tradicional', duration: 30, price: 3000 },
    { id: uid(), name: 'Barba', description: 'Aparar e modelar barba', duration: 20, price: 2000 },
    { id: uid(), name: 'Corte + Barba', description: 'Combo completo', duration: 45, price: 4500 },
  ],
  barbers: [
    { id: uid(), name: '', email: '', phone: '' },
    { id: uid(), name: '', email: '', phone: '' },
  ],
};

const STEPS = ['Informacoes', 'Servicos', 'Barbeiros', 'Revisao'] as const;
const STEP_LABELS = ['Informacoes', 'Servicos', 'Barbeiros', 'Revisao'];
const STEP_ICONS = ['store', 'content_cut', 'group', 'checklist'];

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

// --- Step Indicator ---

function StepIndicator({ current, steps }: { current: number; steps: readonly string[] }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 sm:mb-10">
      {steps.map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`
              w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
              ${i < current ? 'bg-[#D4AF37] text-[#0a0a0a]' : ''}
              ${i === current ? 'bg-[#D4AF37] text-[#0a0a0a] ring-4 ring-[#D4AF37]/30 scale-110' : ''}
              ${i > current ? 'bg-white/10 text-white/40' : ''}
            `}
          >
            {i < current ? (
              <span className="material-symbols-outlined text-base">check</span>
            ) : (
              <span className="material-symbols-outlined text-base">{STEP_ICONS[i]}</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 transition-all duration-300 ${
                i < current ? 'bg-[#D4AF37]' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Step 1: Basic Info ---

function StepBasicInfo({
  data,
  onChange,
  errors,
}: {
  data: ShopFormData;
  onChange: (patch: Partial<ShopFormData>) => void;
  errors: Record<string, string>;
}) {
  const handleNameChange = (name: string) => {
    const patch: Partial<ShopFormData> = { name };
    if (!data.slug || data.slug === generateSlug(data.name)) {
      patch.slug = generateSlug(name);
    }
    onChange(patch);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Dados da Barbearia</h2>
        <p className="text-white/60 text-sm">Preencha as informacoes basicas da nova barbearia.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-white/70 text-sm mb-2">Nome *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Barbearia Premium"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-2">Slug</label>
          <input
            type="text"
            value={data.slug}
            onChange={(e) =>
              onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
            }
            placeholder="barbearia-premium"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-mono text-sm"
          />
          <p className="text-white/40 text-xs mt-1">Gerado automaticamente se deixado em branco.</p>
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-2">Dominio (opcional)</label>
          <input
            type="text"
            value={data.domain}
            onChange={(e) => onChange({ domain: e.target.value })}
            placeholder="exemplo.com"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
          />
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">PINs de Acesso</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">PIN do Proprietario * (4-6 digitos)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={data.ownerPin}
              onChange={(e) => onChange({ ownerPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="1234"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all tracking-[0.3em] text-center font-mono text-lg"
            />
            {errors.ownerPin && <p className="text-red-400 text-xs mt-1">{errors.ownerPin}</p>}
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-2">PIN da Equipe * (4-6 digitos)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={data.staffPin}
              onChange={(e) => onChange({ staffPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="0000"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all tracking-[0.3em] text-center font-mono text-lg"
            />
            {errors.staffPin && <p className="text-red-400 text-xs mt-1">{errors.staffPin}</p>}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Tema</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Cor Primaria</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={data.themePrimary}
                onChange={(e) => onChange({ themePrimary: e.target.value })}
                className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={data.themePrimary}
                onChange={(e) => onChange({ themePrimary: e.target.value })}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-2">Cor de Destaque</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={data.themeAccent}
                onChange={(e) => onChange({ themeAccent: e.target.value })}
                className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={data.themeAccent}
                onChange={(e) => onChange({ themeAccent: e.target.value })}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        {data.name && (
          <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{
                  background: `linear-gradient(135deg, ${data.themeAccent}, ${data.themePrimary})`,
                  color: '#0a0a0a',
                }}
              >
                {data.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{data.name}</p>
                {data.domain && <p className="text-white/50 text-xs">{data.domain}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Step 2: Services ---

function StepServices({
  services,
  onChange,
  errors,
}: {
  services: ServiceItem[];
  onChange: (services: ServiceItem[]) => void;
  errors: Record<string, string>;
}) {
  const addService = () => {
    onChange([...services, { id: uid(), name: '', description: '', duration: 30, price: 0 }]);
  };

  const removeService = (id: string) => {
    if (services.length <= 1) return;
    onChange(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, patch: Partial<ServiceItem>) => {
    onChange(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Servicos</h2>
        <p className="text-white/60 text-sm">
          Personalize os servicos oferecidos. Ja vieram pré-preenchidos como modelo.
        </p>
      </div>

      {errors.services && <p className="text-red-400 text-sm">{errors.services}</p>}

      <div className="space-y-4">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="p-4 sm:p-5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                Servico {index + 1}
              </span>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                  aria-label="Remover servico"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => updateService(service.id, { name: e.target.value })}
                  placeholder="Nome do servico"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={service.description}
                  onChange={(e) => updateService(service.id, { description: e.target.value })}
                  placeholder="Descricao (opcional)"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">Duracao (min)</label>
                <input
                  type="number"
                  min={1}
                  value={service.duration}
                  onChange={(e) =>
                    updateService(service.id, { duration: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">Preco (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(service.price / 100).toFixed(2)}
                  onChange={(e) =>
                    updateService(service.id, {
                      price: Math.round(parseFloat(e.target.value || '0') * 100),
                    })
                  }
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addService}
        className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Adicionar Servico
      </button>
    </div>
  );
}

// --- Step 3: Barbers ---

function StepBarbers({
  barbers,
  onChange,
  errors,
}: {
  barbers: BarberItem[];
  onChange: (barbers: BarberItem[]) => void;
  errors: Record<string, string>;
}) {
  const addBarber = () => {
    onChange([...barbers, { id: uid(), name: '', email: '', phone: '' }]);
  };

  const removeBarber = (id: string) => {
    if (barbers.length <= 1) return;
    onChange(barbers.filter((b) => b.id !== id));
  };

  const updateBarber = (id: string, patch: Partial<BarberItem>) => {
    onChange(barbers.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Barbeiros</h2>
        <p className="text-white/60 text-sm">
          Adicione os barbeiros da equipe. Voce pode adicionar mais depois.
        </p>
      </div>

      {errors.barbers && <p className="text-red-400 text-sm">{errors.barbers}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {barbers.map((barber, index) => (
          <div
            key={barber.id}
            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all relative"
          >
            {barbers.length > 1 && (
              <button
                type="button"
                onClick={() => removeBarber(barber.id)}
                className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1"
                aria-label="Remover barbeiro"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#D4AF37] text-lg">person</span>
              </div>
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                Barbeiro {index + 1}
              </span>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={barber.name}
                onChange={(e) => updateBarber(barber.id, { name: e.target.value })}
                placeholder="Nome *"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
              <input
                type="email"
                value={barber.email}
                onChange={(e) => updateBarber(barber.id, { email: e.target.value })}
                placeholder="Email (opcional)"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
              <input
                type="tel"
                value={barber.phone}
                onChange={(e) => updateBarber(barber.id, { phone: e.target.value })}
                placeholder="Telefone (opcional)"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBarber}
        className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
      >
        <span className="material-symbols-outlined text-lg">person_add</span>
        Adicionar Barbeiro
      </button>
    </div>
  );
}

// --- Step 4: Review ---

function StepReview({ data }: { data: ShopFormData }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Revisao</h2>
        <p className="text-white/60 text-sm">
          Confira os dados antes de criar a barbearia. Voce pode voltar para editar.
        </p>
      </div>

      {/* Shop Info */}
      <div className="p-5 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#D4AF37]">store</span>
          <h3 className="text-lg font-semibold text-white">Barbearia</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-white/50">Nome:</span>
            <p className="text-white font-medium">{data.name}</p>
          </div>
          <div>
            <span className="text-white/50">Slug:</span>
            <p className="text-white font-mono text-xs">{data.slug || generateSlug(data.name)}</p>
          </div>
          {data.domain && (
            <div>
              <span className="text-white/50">Dominio:</span>
              <p className="text-white">{data.domain}</p>
            </div>
          )}
          <div>
            <span className="text-white/50">PIN Proprietario:</span>
            <p className="text-white font-mono">{'*'.repeat(data.ownerPin.length)}</p>
          </div>
          <div>
            <span className="text-white/50">PIN Equipe:</span>
            <p className="text-white font-mono">{'*'.repeat(data.staffPin.length)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-white/50 text-sm">Tema:</span>
          <div className="w-5 h-5 rounded" style={{ backgroundColor: data.themePrimary }} />
          <div className="w-5 h-5 rounded" style={{ backgroundColor: data.themeAccent }} />
        </div>
      </div>

      {/* Services */}
      <div className="p-5 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#D4AF37]">content_cut</span>
          <h3 className="text-lg font-semibold text-white">
            {data.services.length} Servico{data.services.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="space-y-2">
          {data.services.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
            >
              <div>
                <p className="text-white text-sm font-medium">{s.name}</p>
                {s.description && <p className="text-white/40 text-xs">{s.description}</p>}
              </div>
              <div className="text-right">
                <p className="text-white text-sm">{s.duration} min</p>
                {s.price > 0 && <p className="text-[#D4AF37] text-xs">{formatPrice(s.price)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barbers */}
      <div className="p-5 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#D4AF37]">group</span>
          <h3 className="text-lg font-semibold text-white">
            {data.barbers.length} Barbeiro{data.barbers.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.barbers.map((b) => (
            <div key={b.id} className="flex items-center gap-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#D4AF37] text-sm">person</span>
              </div>
              <div>
                <p className="text-white text-sm">{b.name}</p>
                {b.email && <p className="text-white/40 text-xs">{b.email}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export function CreateShopPage() {
  const navigate = useNavigate();
  const { user, isCompanyAdmin } = useAuthContext();
  const cancelModal = useModal();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<ShopFormData>({ ...TEMPLATE });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const useRootTheme = isRootBuild();
  const Nav = useRootTheme ? RootSiteNav : CompanyNav;

  const isDirty = useMemo(() => {
    return data.name !== '' || data.ownerPin !== '' || data.staffPin !== '';
  }, [data]);

  const onChange = useCallback((patch: Partial<ShopFormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    // Clear relevant errors
    const newErrors = { ...errors };
    Object.keys(patch).forEach((key) => delete newErrors[key]);
    setErrors(newErrors);
  }, [errors]);

  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};

      if (s === 0) {
        if (!data.name.trim()) errs.name = 'Nome e obrigatorio';
        if (!data.ownerPin || data.ownerPin.length < 4) errs.ownerPin = 'PIN deve ter 4-6 digitos';
        if (!data.staffPin || data.staffPin.length < 4) errs.staffPin = 'PIN deve ter 4-6 digitos';
      }

      if (s === 1) {
        const hasEmpty = data.services.some((s) => !s.name.trim());
        if (hasEmpty) errs.services = 'Todos os servicos precisam de um nome';
        if (data.services.length === 0) errs.services = 'Adicione pelo menos 1 servico';
      }

      if (s === 2) {
        const hasEmpty = data.barbers.some((b) => !b.name.trim());
        if (hasEmpty) errs.barbers = 'Todos os barbeiros precisam de um nome';
        if (data.barbers.length === 0) errs.barbers = 'Adicione pelo menos 1 barbeiro';
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [data]
  );

  const next = useCallback(() => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }, [step, validateStep]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      cancelModal.open();
    } else {
      navigate('/company/dashboard');
    }
  }, [isDirty, cancelModal, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!user?.companyId) return;

    // Validate all steps
    for (let s = 0; s < 3; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.createFullShop(user.companyId, {
        name: data.name,
        slug: data.slug || undefined,
        domain: data.domain || undefined,
        theme: { primary: data.themePrimary, accent: data.themeAccent },
        ownerPin: data.ownerPin,
        staffPin: data.staffPin,
        services: data.services.map((s) => ({
          name: s.name,
          description: s.description || undefined,
          duration: s.duration,
          price: s.price || undefined,
        })),
        barbers: data.barbers.map((b) => ({
          name: b.name,
          email: b.email || undefined,
          phone: b.phone || undefined,
        })),
      });

      navigate('/company/dashboard');
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Erro ao criar barbearia. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.companyId, data, validateStep, navigate]);

  if (!isCompanyAdmin || !user?.companyId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37] mb-2">Nova Barbearia</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">
            {STEP_LABELS[step]}
          </h1>
        </div>

        <StepIndicator current={step} steps={STEPS} />

        {/* Submit error */}
        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {submitError}
          </div>
        )}

        {/* Steps */}
        {step === 0 && <StepBasicInfo data={data} onChange={onChange} errors={errors} />}
        {step === 1 && (
          <StepServices
            services={data.services}
            onChange={(services) => onChange({ services })}
            errors={errors}
          />
        )}
        {step === 2 && (
          <StepBarbers
            barbers={data.barbers}
            onChange={(barbers) => onChange({ barbers })}
            errors={errors}
          />
        )}
        {step === 3 && <StepReview data={data} />}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 text-white/60 hover:text-white transition-colors text-sm"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-white/20 rounded-xl text-white hover:border-white/40 transition-all text-sm"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Voltar
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[#D4AF37] text-[#0a0a0a] rounded-xl font-semibold hover:bg-[#e2c25a] transition-all text-sm"
              >
                Proximo
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#D4AF37] text-[#0a0a0a] rounded-xl font-semibold hover:bg-[#e2c25a] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check</span>
                    Criar Barbearia
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Cancel confirmation */}
      <ConfirmationDialog
        isOpen={cancelModal.isOpen}
        onClose={cancelModal.close}
        onConfirm={() => navigate('/company/dashboard')}
        title="Descartar alteracoes?"
        message="Todos os dados preenchidos serao perdidos. Tem certeza?"
        confirmText="Descartar"
        cancelText="Continuar editando"
        variant="destructive"
        icon="warning"
      />
    </div>
  );
}
