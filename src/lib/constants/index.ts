export const UNIT = "mm" as const;
export const CURRENCY = "EUR" as const;
export const LOCALE = "pt-PT" as const;
export const DEFAULT_IVA = 23;
export const DEFAULT_THICKNESS_MM = 19;
export const ALLOWED_THICKNESSES_MM = [3, 4, 6, 8, 16, 19, 25] as const;

export const APP_NAME = "MADEIRA MADEIRA";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(value);
}
