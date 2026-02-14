import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

const DURATION_OPTIONS = [10, 15, 20, 30] as const;
/** Default prices in BRL cents: 10s R$30, 15s R$45, 20s R$60, 30s R$90 */
const DEFAULT_CENTS: Record<(typeof DURATION_OPTIONS)[number], number> = {
  10: 3000,
  15: 4500,
  20: 6000,
  30: 9000,
};

export function getDefaultAmountCents(durationSeconds: number): number {
  if (DURATION_OPTIONS.includes(durationSeconds as 10 | 15 | 20 | 30)) {
    return DEFAULT_CENTS[durationSeconds as 10 | 15 | 20 | 30];
  }
  return DEFAULT_CENTS[15];
}

export async function getAmountCentsForCompany(
  companyId: number,
  durationSeconds: number
): Promise<number> {
  const row = await db.query.adPricing.findFirst({
    where: and(
      eq(schema.adPricing.companyId, companyId),
      eq(schema.adPricing.durationSeconds, durationSeconds)
    ),
  });
  if (row) return row.amountCents;
  return getDefaultAmountCents(durationSeconds);
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
