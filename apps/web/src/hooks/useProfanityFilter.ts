/**
 * Name validation (length only). Profanity filtering was removed because it
 * incorrectly flagged normal names (e.g. "Paulo" matching substrings).
 */
export function useProfanityFilter() {
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

    const fullName = lastName?.trim()
      ? `${trimmed} ${lastName.trim()}`
      : trimmed;

    if (fullName.length > 200) {
      return { isValid: false, error: 'Nome muito longo (máximo 200 caracteres)' };
    }

    return { isValid: true };
  };

  return {
    validateName,
  };
}
