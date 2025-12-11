/**
 * Content Strategy Guidelines
 * 
 * Guidelines for headings, paragraphs, CTAs, and content tone
 * to ensure consistency across all pages.
 */

// ============================================================================
// Heading Guidelines
// ============================================================================
export const headingGuidelines = {
  h1: {
    maxWords: 10,
    description: 'Hero heading, 1 per page, action-oriented',
    examples: ['Barbearia Mineiro', 'Entre na Fila', 'Sua Posição na Fila'],
  },
  h2: {
    maxWords: 4,
    description: 'Section headings, descriptive, clear hierarchy',
    examples: ['Serviços', 'Sobre Nós', 'Localização'],
  },
  h3: {
    maxWords: 6,
    description: 'Subsection headings, supporting H2 content',
    examples: ['Corte de Cabelo', 'Horário de Funcionamento'],
  },
} as const;

// ============================================================================
// Paragraph Length Guidelines
// ============================================================================
export const paragraphGuidelines = {
  heroSubtitle: {
    minWords: 8,
    maxWords: 12,
    description: 'Hero subtitle, concise value proposition',
    example: 'Entre na fila online e economize tempo',
  },
  body: {
    minWords: 40,
    maxWords: 60,
    sentences: '2-3 sentences',
    description: 'Body paragraphs, scannable',
    example: 'Na Barbearia Mineiro, combinamos técnicas tradicionais com tendências modernas. Nossa equipe experiente está pronta para atender você.',
  },
  feature: {
    maxWords: 15,
    sentences: '1 sentence',
    description: 'Feature descriptions, brief and clear',
    example: 'Fila online sem complicação',
  },
} as const;

// ============================================================================
// CTA Patterns
// ============================================================================
export const ctaPatterns = {
  primary: {
    text: 'Entrar na Fila',
    description: 'Gold button, prominent placement',
    placement: 'Thumb-friendly zone on mobile',
  },
  secondary: {
    text: 'Como Chegar',
    description: 'Outline button, less prominent',
    placement: 'Below primary CTA or in navigation',
  },
  tertiary: {
    text: 'Ver status',
    description: 'Text link with hover states',
    placement: 'Supporting content areas',
  },
} as const;

// ============================================================================
// Content Tone
// ============================================================================
export const contentTone = {
  style: 'Professional but approachable',
  language: 'Clear, direct language',
  locale: 'Portuguese (Brazilian)',
  avoid: ['Jargon', 'Complex explanations', 'Unnecessary technical terms'],
  prefer: ['Simple explanations', 'Action verbs', 'Direct statements'],
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates heading length against guidelines
 */
export function validateHeading(text: string, level: 'h1' | 'h2' | 'h3'): boolean {
  const words = text.trim().split(/\s+/).length;
  const guideline = headingGuidelines[level];
  return words <= guideline.maxWords;
}

/**
 * Validates paragraph length against guidelines
 */
export function validateParagraph(
  text: string,
  type: 'heroSubtitle' | 'body' | 'feature'
): boolean {
  const words = text.trim().split(/\s+/).length;
  const guideline = paragraphGuidelines[type];
  
  if (type === 'heroSubtitle') {
    return words >= guideline.minWords && words <= guideline.maxWords;
  }
  
  if (type === 'body') {
    return words >= guideline.minWords && words <= guideline.maxWords;
  }
  
  // feature (no minWords, only maxWords)
  return words <= guideline.maxWords;
}

/**
 * Gets word count for a text string
 */
export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}
