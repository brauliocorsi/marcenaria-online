import { LOCALE, CURRENCY } from "@/lib/constants";

export function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(v);
}

export function fmtMM(v: number | null | undefined, decimals = 0): string {
  if (v == null) return "—";
  return `${v.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} mm`;
}
