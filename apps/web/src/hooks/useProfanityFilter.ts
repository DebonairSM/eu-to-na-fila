// Brazilian Portuguese profanity list
const PROFANITY_LIST = [
  'porra',
  'merda',
  'caralho',
  'puta',
  'fdp',
  'filho da puta',
  'vai tomar no cu',
  'cu',
  'buceta',
  'cacete',
  'pica',
  'pau',
  'viado',
  'bicha',
  'arrombado',
  'desgraça',
  'desgraçado',
  'babaca',
  'otario',
  'otário',
  'idiota',
  'imbecil',
  'corno',
  'putaria',
  'vagabundo',
  'safado',
  'piranha',
  'vadia',
];

export function useProfanityFilter() {
  const containsProfanity = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return PROFANITY_LIST.some((word) => lowerText.includes(word));
  };

  const validateName = (
    firstName: string,
    lastName?: string
  ): { isValid: boolean; error?: string } => {
    const trimmed = firstName.trim();

    if (trimmed.length === 0) {
      return { isValid: false, error: 'Por favor, digite seu nome' };
    }

    if (trimmed.length < 2) {
      return { isValid: false, error: 'Nome muito curto (mínimo 2 caracteres)' };
    }

    // Combine first and last name for full validation
    const fullName = lastName?.trim()
      ? `${trimmed} ${lastName.trim()}`
      : trimmed;

    // Check combined name length (1-200 characters per API spec)
    if (fullName.length > 200) {
      return { isValid: false, error: 'Nome muito longo (máximo 200 caracteres)' };
    }

    if (containsProfanity(fullName)) {
      return { isValid: false, error: 'Por favor, use um nome apropriado' };
    }

    return { isValid: true };
  };

  return {
    containsProfanity,
    validateName,
  };
}
