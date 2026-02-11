/**
 * Predefined barbershop features with icons
 * Icons use Material Symbols (https://fonts.google.com/icons)
 */

export interface BarbershopFeature {
  id: string;
  icon: string;
  labelPtBR: string;
  labelEn: string;
  category: 'service' | 'amenity' | 'payment' | 'special';
}

export const BARBERSHOP_FEATURES: BarbershopFeature[] = [
  // Services
  { id: 'haircut', icon: 'content_cut', labelPtBR: 'Corte de cabelo', labelEn: 'Haircut', category: 'service' },
  { id: 'beard', icon: 'face_5', labelPtBR: 'Barba', labelEn: 'Beard trim', category: 'service' },
  { id: 'shave', icon: 'cut', labelPtBR: 'Barbear tradicional', labelEn: 'Traditional shave', category: 'service' },
  { id: 'hair-coloring', icon: 'palette', labelPtBR: 'Coloração', labelEn: 'Hair coloring', category: 'service' },
  { id: 'hair-treatment', icon: 'spa', labelPtBR: 'Tratamento capilar', labelEn: 'Hair treatment', category: 'service' },
  { id: 'kids-cut', icon: 'child_care', labelPtBR: 'Corte infantil', labelEn: 'Kids haircut', category: 'service' },
  { id: 'styling', icon: 'auto_fix_high', labelPtBR: 'Penteado/Styling', labelEn: 'Hair styling', category: 'service' },
  { id: 'eyebrow', icon: 'visibility', labelPtBR: 'Design de sobrancelha', labelEn: 'Eyebrow design', category: 'service' },
  
  // Amenities
  { id: 'wifi', icon: 'wifi', labelPtBR: 'Wi-Fi grátis', labelEn: 'Free Wi-Fi', category: 'amenity' },
  { id: 'parking', icon: 'local_parking', labelPtBR: 'Estacionamento', labelEn: 'Parking', category: 'amenity' },
  { id: 'ac', icon: 'ac_unit', labelPtBR: 'Ar condicionado', labelEn: 'Air conditioning', category: 'amenity' },
  { id: 'tv', icon: 'tv', labelPtBR: 'TV', labelEn: 'TV', category: 'amenity' },
  { id: 'coffee', icon: 'local_cafe', labelPtBR: 'Café/Bebidas', labelEn: 'Coffee/Drinks', category: 'amenity' },
  { id: 'music', icon: 'music_note', labelPtBR: 'Música ambiente', labelEn: 'Background music', category: 'amenity' },
  { id: 'magazines', icon: 'menu_book', labelPtBR: 'Revistas', labelEn: 'Magazines', category: 'amenity' },
  { id: 'waiting-area', icon: 'event_seat', labelPtBR: 'Sala de espera', labelEn: 'Waiting area', category: 'amenity' },
  { id: 'accessibility', icon: 'accessible', labelPtBR: 'Acessibilidade', labelEn: 'Accessibility', category: 'amenity' },
  { id: 'pet-friendly', icon: 'pets', labelPtBR: 'Pet friendly', labelEn: 'Pet friendly', category: 'amenity' },
  
  // Payment
  { id: 'card', icon: 'credit_card', labelPtBR: 'Cartão de crédito/débito', labelEn: 'Credit/Debit card', category: 'payment' },
  { id: 'pix', icon: 'qr_code_2', labelPtBR: 'PIX', labelEn: 'PIX', category: 'payment' },
  { id: 'cash', icon: 'payments', labelPtBR: 'Dinheiro', labelEn: 'Cash', category: 'payment' },
  { id: 'contactless', icon: 'contactless', labelPtBR: 'Pagamento por aproximação', labelEn: 'Contactless payment', category: 'payment' },
  
  // Special
  { id: 'appointment', icon: 'event', labelPtBR: 'Agendamento online', labelEn: 'Online booking', category: 'special' },
  { id: 'walk-in', icon: 'directions_walk', labelPtBR: 'Atende sem agendamento', labelEn: 'Walk-ins welcome', category: 'special' },
  { id: 'loyalty', icon: 'card_giftcard', labelPtBR: 'Programa de fidelidade', labelEn: 'Loyalty program', category: 'special' },
  { id: 'products', icon: 'shopping_bag', labelPtBR: 'Venda de produtos', labelEn: 'Product sales', category: 'special' },
  { id: 'professional', icon: 'workspace_premium', labelPtBR: 'Profissionais certificados', labelEn: 'Certified professionals', category: 'special' },
  { id: 'hygiene', icon: 'sanitizer', labelPtBR: 'Higiene e esterilização', labelEn: 'Hygiene & sterilization', category: 'special' },
  { id: 'premium', icon: 'diamond', labelPtBR: 'Atendimento premium', labelEn: 'Premium service', category: 'special' },
  { id: 'experience', icon: 'star', labelPtBR: 'Experiência completa', labelEn: 'Full experience', category: 'special' },
];

export const CUSTOM_FEATURE_ID = 'custom';

/**
 * Get feature by ID
 */
export function getFeatureById(id: string): BarbershopFeature | undefined {
  return BARBERSHOP_FEATURES.find(f => f.id === id);
}

/**
 * Get feature label by ID and locale
 */
export function getFeatureLabel(id: string, locale: string): string {
  const feature = getFeatureById(id);
  if (!feature) return id;
  return locale === 'pt-BR' ? feature.labelPtBR : feature.labelEn;
}
