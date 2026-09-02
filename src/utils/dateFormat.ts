import { format, parseISO } from 'date-fns';

// Always use date-fns for date-only strings (YYYY-MM-DD) — date-fns parses
// them as local calendar dates, unlike `new Date(dateOnlyString)`, which
// parses as UTC midnight and can display a day off depending on timezone.

export function todayLocalISODate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDisplayDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd MMM yyyy');
}

export function formatMonthLabel(monthKey: string): string {
  return format(parseISO(`${monthKey}-01`), 'MMM yyyy');
}

export function toDateOnlyString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateOnly(isoDate: string): Date {
  return parseISO(isoDate);
}
