// Unit price ("Grundpreis") as Shopify delivers it (variant unitPrice and unitPriceMeasurement).
// The site never computes a unit price to show: without one from Shopify nothing is shown. The numbers
// are only checked, at build time (catalog.ts) and before a live update (scripts/commerce.ts).
// Plain functions without dependencies on the build, so the browser bundle can use them too.
import { formatMoney } from './cart.ts';
import type { Money, UnitPrice } from './types.ts';

/** Shopify measured units the site understands: dimension, factor to the base unit (g, ml, m, m²), UN/CEFACT code, label. */
const UNITS: Record<string, { dimension: string; factor: number; code: string; label: string }> = {
  MG: { dimension: 'Gewicht', factor: 0.001, code: 'MGM', label: 'mg' },
  G: { dimension: 'Gewicht', factor: 1, code: 'GRM', label: 'g' },
  KG: { dimension: 'Gewicht', factor: 1000, code: 'KGM', label: 'kg' },
  ML: { dimension: 'Volumen', factor: 1, code: 'MLT', label: 'ml' },
  CL: { dimension: 'Volumen', factor: 10, code: 'CLT', label: 'cl' },
  L: { dimension: 'Volumen', factor: 1000, code: 'LTR', label: 'l' },
  MM: { dimension: 'Länge', factor: 0.001, code: 'MMT', label: 'mm' },
  CM: { dimension: 'Länge', factor: 0.01, code: 'CMT', label: 'cm' },
  M: { dimension: 'Länge', factor: 1, code: 'MTR', label: 'm' },
  M2: { dimension: 'Fläche', factor: 1, code: 'MTK', label: 'm²' },
};

const number = (value: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(value);

/** e.g. "17.800,00 €/kg" or "1,78 €/100 g". Only for a unit price that passed checkUnitPrice. */
export function unitPriceText(unit: UnitPrice): string {
  const label = UNITS[unit.referenceUnit].label;
  return `${formatMoney(unit.price)}/${unit.referenceValue === 1 ? label : `${number(unit.referenceValue)} ${label}`}`;
}

/** The visible line, the same at every price: "Grundpreis 17.800,00 €/kg". */
export function unitPriceLabel(unit: UnitPrice): string {
  return `Grundpreis ${unitPriceText(unit)}`;
}

/**
 * null when the unit price fits, otherwise the reason (German, for the build message).
 * Fits means: known units of one dimension, the currency of the price, unit price = price ÷ quantity ×
 * reference quantity to the cent, and with a known net weight (product.ts, the label) a quantity of
 * exactly that weight. The last rule catches a wrong quantity in Shopify, which Shopify itself turns
 * into a consistent but wrong unit price (live on 15.10.: 0.5 g at 8.90 € shown as 8,900 €/kg).
 */
export function checkUnitPrice(price: Money, unit: UnitPrice, netGrams: number | null = null): string | null {
  const q = UNITS[unit.quantityUnit];
  const r = UNITS[unit.referenceUnit];
  if (!q || !r) return `Einheit nicht unterstützt (${unit.quantityUnit || '–'} / ${unit.referenceUnit || '–'})`;
  if (q.dimension !== r.dimension) return `Menge (${q.dimension}) und Bezugsmenge (${r.dimension}) passen nicht zusammen`;
  if (!(unit.quantityValue > 0) || !(unit.referenceValue > 0)) return `Menge ${unit.quantityValue} ${q.label} oder Bezugsmenge ${unit.referenceValue} ${r.label} fehlt`;
  if (unit.price.currencyCode !== price.currencyCode) return `Währung des Grundpreises ${unit.price.currencyCode}, des Preises ${price.currencyCode}`;
  const shown = Number(unit.price.amount);
  const expected = (Number(price.amount) / (unit.quantityValue * q.factor)) * (unit.referenceValue * r.factor);
  if (!Number.isFinite(shown) || Math.abs(shown - expected) > 0.01 + 1e-9) {
    return `Grundpreis ${formatMoney(unit.price)} je ${number(unit.referenceValue)} ${r.label}, aus Preis ${formatMoney(price)} und Menge ${number(unit.quantityValue)} ${q.label} folgen ${formatMoney({ amount: expected.toFixed(2), currencyCode: price.currencyCode })}`;
  }
  if (netGrams !== null && q.dimension === 'Gewicht' && Math.abs(unit.quantityValue * q.factor - netGrams) > 1e-9) {
    return `Menge in Shopify ${number(unit.quantityValue)} ${q.label}, laut Etikett (src/data/product.ts) ${number(netGrams)} g`;
  }
  return null;
}

/**
 * Line for a live update of the buy box: the label when Shopify's current unit price fits, otherwise
 * null (the page then hides the line instead of showing a unit price that no longer matches the price).
 */
export function liveUnitPriceLabel(price: Money, unit: UnitPrice | null, netGrams: number | null): string | null {
  return unit && checkUnitPrice(price, unit, netGrams) === null ? unitPriceLabel(unit) : null;
}

/**
 * Quantities for schema.org UnitPriceSpecification as Google reads it: the product price applies to
 * `quantity` (e.g. 0.5 GRM), priced per `reference` (e.g. 1 KGM). Only for a unit price that passed checkUnitPrice.
 */
export function unitPricing(unit: UnitPrice): { quantity: { value: number; unitCode: string }; reference: { value: number; unitCode: string } } {
  return {
    quantity: { value: unit.quantityValue, unitCode: UNITS[unit.quantityUnit].code },
    reference: { value: unit.referenceValue, unitCode: UNITS[unit.referenceUnit].code },
  };
}
