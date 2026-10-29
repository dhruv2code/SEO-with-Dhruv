import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs) => twMerge(clsx(inputs));
export const number = (value, digits = 0) => value == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(value);
export const compact = (value) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
