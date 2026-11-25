import type { Language } from '../../i18n';

// Numbers 0–100 written as words, for the parental gate question (F05, A28).
// Lower case; the question text capitalises the first letter.

const VI_UNITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/**
 * Vietnamese: 10 "mười", 15 "mười lăm", 21 "hai mươi mốt", 24 "hai mươi tư", 25 "hai mươi lăm",
 * 30 "ba mươi", 100 "một trăm".
 */
function vi(n: number): string {
  if (n < 10) return VI_UNITS[n];
  if (n === 100) return 'một trăm';
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const head = tens === 1 ? 'mười' : `${VI_UNITS[tens]} mươi`;
  if (unit === 0) return head;
  let tail = VI_UNITS[unit];
  if (unit === 5) tail = 'lăm';
  else if (unit === 1 && tens > 1) tail = 'mốt';
  else if (unit === 4 && tens > 1) tail = 'tư';
  return `${head} ${tail}`;
}

const EN_SMALL = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** English: 42 "forty-two", 100 "one hundred". */
function en(n: number): string {
  if (n < 20) return EN_SMALL[n];
  if (n === 100) return 'one hundred';
  const unit = n % 10;
  return unit === 0 ? EN_TENS[Math.floor(n / 10)] : `${EN_TENS[Math.floor(n / 10)]}-${EN_SMALL[unit]}`;
}

/** `n` (integer 0..100) in words. */
export function numberToWords(n: number, lang: Language): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new RangeError(`numberToWords: ${n} is not an integer in 0..100`);
  return lang === 'vi' ? vi(n) : en(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
