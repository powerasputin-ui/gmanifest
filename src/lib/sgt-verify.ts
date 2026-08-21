import type { SgtData } from './excel-template-engine';

/**
 * Deterministic plausibility checks run on the LLM's extracted СГТ fields
 * before they're written into the Excel template — catches the exact class
 * of error the export-sgt e2e tests already probe for manually (a number in
 * the wrong column, an IMO number leaked into Vendor, an implausible
 * dimension) but as a live signal on every real extraction, not just in
 * tests. Never blocks the export — a flagged document still downloads, the
 * warnings are surfaced for a human to double-check.
 */
export interface SgtWarning {
  row: number | null;
  field: string;
  message: string;
}

// Generous physical bounds for cargo/container units — wide enough to never
// false-positive on a real vessel/container, tight enough to catch garbage
// (a value with units left in from the source, or from the wrong column).
const DIMENSION_MM_RANGE = { min: 1, max: 500_000 }; // up to 500m
const WEIGHT_KG_RANGE = { min: 0.001, max: 500_000_000 }; // up to 500k tonnes

function parseNumeric(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = value.trim().replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function checkRange(value: string | null | undefined, range: { min: number; max: number }): boolean {
  const num = parseNumeric(value);
  if (num === null) return true; // non-numeric values are the template's own fallback path, not this check's concern
  return num >= range.min && num <= range.max;
}

/** IMO number check digit: sum of the first 6 digits, each weighted by its
 * position (7 down to 2), mod 10 must equal the 7th digit. */
function isValidImoChecksum(imoDigits: string): boolean {
  if (!/^\d{7}$/.test(imoDigits)) return false;
  const digits = imoDigits.split('').map(Number);
  const sum = digits.slice(0, 6).reduce((acc, d, i) => acc + d * (7 - i), 0);
  return sum % 10 === digits[6];
}

export function verifySgtData(data: SgtData): SgtWarning[] {
  const warnings: SgtWarning[] = [];
  const items = data.cargoItems || [];

  items.forEach((item, index) => {
    const row = index + 1;

    const imoMatch = item.unitIdNo?.match(/\b(\d{7})\b/);
    if (imoMatch && /imo/i.test(item.unitIdNo || '') && !isValidImoChecksum(imoMatch[1])) {
      warnings.push({
        row,
        field: 'unitIdNo',
        message: `IMO number "${imoMatch[1]}" fails the IMO check-digit validation — verify against the source`,
      });
    }

    if (item.unitIdNo && !/\d/.test(item.unitIdNo)) {
      warnings.push({ row, field: 'unitIdNo', message: 'Unit ID has no digits at all — check it wasn\'t swapped with another column' });
    }
    if (item.vendorOwner && /^[\d\s.,-]+$/.test(item.vendorOwner)) {
      warnings.push({ row, field: 'vendorOwner', message: 'Vendor/Owner is purely numeric — check it wasn\'t swapped with an ID/quantity column' });
    }

    if (!checkRange(item.lengthMm, DIMENSION_MM_RANGE)) {
      warnings.push({ row, field: 'lengthMm', message: `Length "${item.lengthMm}" is outside a plausible range` });
    }
    if (!checkRange(item.widthMm, DIMENSION_MM_RANGE)) {
      warnings.push({ row, field: 'widthMm', message: `Width "${item.widthMm}" is outside a plausible range` });
    }
    if (!checkRange(item.heightMm, DIMENSION_MM_RANGE)) {
      warnings.push({ row, field: 'heightMm', message: `Height "${item.heightMm}" is outside a plausible range` });
    }
    if (!checkRange(item.weightKg, WEIGHT_KG_RANGE)) {
      warnings.push({ row, field: 'weightKg', message: `Weight "${item.weightKg}" is outside a plausible range` });
    }
  });

  return warnings;
}
