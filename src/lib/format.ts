/**
 * Single source of truth for locale and WIB timezone rendering in React Native.
 * Server data is always integer grams, integer IDR, and integer epoch ms UTC.
 */

const LOCALE = 'id-ID';
const WIB_OFFSET_MS = 7 * 60 * 60 * 1_000;

const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const WEEKDAYS_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

function wibParts(epochMs: number) {
  const shifted = new Date(epochMs + WIB_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatGroupedNumber(value: number, fractionDigits = 0): string {
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 ? '-' : '';
  return decPart !== undefined && fractionDigits > 0
    ? `${sign}${grouped},${decPart}`
    : `${sign}${grouped}`;
}

export function formatIdr(amountIdr: number): string {
  const sign = amountIdr < 0 ? '-' : '';
  return `${sign}Rp${formatGroupedNumber(Math.round(Math.abs(amountIdr)), 0)}`;
}

export function formatKg(grams: number): string {
  return `${formatGroupedNumber(grams / 1_000, 1)} kg`;
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const hasDecimal = Math.abs(rounded % 1) > 0;
  return `${formatGroupedNumber(rounded, hasDecimal ? 1 : 0)}%`;
}

export function formatWeight(grams: number): string {
  return grams < 1_000
    ? `${formatGroupedNumber(Math.round(grams), 0)} g`
    : formatKg(grams);
}

/** "17.00" — WIB clock time, 24-hour. */
export function formatWibTime(epochMs: number): string {
  const { hours, minutes } = wibParts(epochMs);
  return `${pad2(hours)}.${pad2(minutes)}`;
}

/** "27 Agu 2026" */
export function formatWibDate(epochMs: number): string {
  const { day, month, year } = wibParts(epochMs);
  return `${day} ${MONTHS_ID[month]} ${year}`;
}

/** "Kamis, 27 Agu" */
export function formatWibDay(epochMs: number): string {
  const { weekday, day, month } = wibParts(epochMs);
  return `${WEEKDAYS_ID[weekday]}, ${day} ${MONTHS_ID[month]}`;
}

export function formatWibDateTime(epochMs: number): string {
  const { day, month, year, hours, minutes, seconds } = wibParts(epochMs);
  return `${day} ${MONTHS_ID[month]} ${year}, ${pad2(hours)}.${pad2(minutes)}.${pad2(seconds)} WIB`;
}

/** "17.00-19.00 WIB" */
export function formatPickupWindow(startAt: number, endAt: number): string {
  return `${formatWibTime(startAt)}-${formatWibTime(endAt)} WIB`;
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1_000) {
    return `${formatGroupedNumber(Math.round(distanceMeters), 0)} m`;
  }
  const km = Math.round((distanceMeters / 1_000) * 10) / 10;
  const hasDecimal = Math.abs(km % 1) > 0;
  return `${formatGroupedNumber(km, hasDecimal ? 1 : 0)} km`;
}

export function formatInteger(value: number): string {
  return formatGroupedNumber(Math.round(value), 0);
}

export { LOCALE };
