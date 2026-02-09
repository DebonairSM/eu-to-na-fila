/** Default home page content when shop has none set. Every element is overridable per shop. */
export const DEFAULT_HOME_CONTENT = {
  hero: {
    badge: 'Sangão, Santa Catarina',
    subtitle: 'Entre na fila online',
    ctaJoin: 'Entrar na Fila',
    ctaLocation: 'Como Chegar',
  },
  nav: {
    linkServices: 'Serviços',
    linkAbout: 'Sobre',
    linkLocation: 'Localização',
    ctaJoin: 'Entrar na Fila',
    linkBarbers: 'Barbeiros',
    labelDashboard: 'Dashboard',
    labelDashboardCompany: 'Dashboard Empresarial',
    labelLogout: 'Sair',
    labelMenu: 'Menu',
  },
  services: {
    sectionTitle: 'Serviços',
    loadingText: 'Carregando serviços...',
    emptyText: 'Nenhum serviço cadastrado.',
  },
  about: {
    sectionTitle: 'Sobre',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80',
    imageAlt: 'Interior da barbearia',
    features: [
      { icon: 'schedule', text: 'Fila online' },
      { icon: 'workspace_premium', text: 'Produtos premium' },
      { icon: 'groups', text: 'Equipe experiente' },
      { icon: 'local_parking', text: 'Estacionamento fácil' },
    ],
  },
  location: {
    sectionTitle: 'Localização',
    labelAddress: 'Endereço',
    labelHours: 'Horário de Funcionamento',
    labelPhone: 'Telefone',
    labelLanguages: 'Idiomas',
    linkMaps: 'Ver no Google Maps',
    address: 'R. João M Silvano, 281 - Morro Grande\nSangão - SC, 88717-000',
    addressLink: 'https://www.google.com/maps/search/?api=1&query=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
    hours: 'Segunda a Sábado: 9:00 - 19:00\nDomingo: Fechado',
    phone: '(48) 99835-4097',
    phoneHref: 'tel:+5548998354097',
    languages: 'Português & English',
    mapQuery: 'R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
  },
  accessibility: {
    skipLink: 'Pular para o conteúdo principal',
    loading: 'Carregando…',
  },
} as const;

export type DefaultHomeContent = typeof DEFAULT_HOME_CONTENT;

export function mergeHomeContent(stored: unknown): DefaultHomeContent {
  if (!stored || typeof stored !== 'object') return DEFAULT_HOME_CONTENT;
  const deepMerge = <T>(def: T, from: unknown): T => {
    if (from == null || typeof from !== 'object') return def;
    const o = from as Record<string, unknown>;
    const out = { ...def } as Record<string, unknown>;
    for (const k of Object.keys(def as object)) {
      const defVal = (def as Record<string, unknown>)[k];
      const fromVal = o[k];
      if (defVal && typeof defVal === 'object' && !Array.isArray(defVal) && fromVal && typeof fromVal === 'object' && !Array.isArray(fromVal)) {
        out[k] = deepMerge(defVal, fromVal);
      } else if (fromVal !== undefined) {
        out[k] = Array.isArray(fromVal) ? [...fromVal] : fromVal;
      }
    }
    return out as T;
  };
  return deepMerge(DEFAULT_HOME_CONTENT, stored);
}
