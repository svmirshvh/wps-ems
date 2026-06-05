import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateInput(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  MANAGER_APPROVED: 'Manager Approved',
  FINANCE_APPROVED: 'Finance Approved',
  PAID: 'Paid',
  REJECTED: 'Rejected',
};

export const CLAIM_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  MANAGER_APPROVED: 'bg-lime-100 text-lime-700',
  FINANCE_APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
};

export const EXPENSE_CATEGORIES = [
  {
    code: 'A',
    name: 'A: Travel Expenses',
    items: [
      { plNr: '4412212', name: 'Rental cars, car costs' },
      { plNr: '4412213', name: 'Flight costs' },
      { plNr: '4412216', name: 'Daily Travel expenses' },
      { plNr: '4412217', name: 'Hotels' },
    ],
  },
  {
    code: 'B',
    name: 'B: Office Supplies',
    items: [
      { plNr: '4412916', name: 'Office supplies, IT equipment' },
    ],
  },
  {
    code: 'C',
    name: 'C: Meals & Entertainment - Clients',
    items: [
      { plNr: '4412218', name: 'FNB Food and beverage' },
    ],
  },
  {
    code: 'D',
    name: 'D: Telecommunication',
    items: [
      { plNr: '4412411', name: 'Phone costs, Internet, data, roaming' },
    ],
  },
  {
    code: 'E',
    name: 'E: Marketing',
    items: [
      { plNr: '4411918', name: 'MKT - EXHIBITIONS' },
      { plNr: '4411921', name: 'MKT - BRAND AWARENESS, PUBLIC RELATIONS' },
      { plNr: '4411911', name: 'MKT - Sales Promotion, samples free-of-charge, customer gifts' },
      { plNr: '4411913', name: 'MKT - Sales Customer Events' },
    ],
  },
  {
    code: 'F',
    name: 'F: Logistics',
    items: [
      { plNr: '4411812', name: 'Sales Outbound Freight and delivery costs' },
    ],
  },
  {
    code: 'G',
    name: 'G: Others',
    items: [],
  },
];

export const PILLARS = [
  'Manufacturing AD',
  'Manufacturing DXB & NE',
  'Construction',
  'Infrastructure',
  'Operations',
  'WPS',
];

export const CURRENCIES = ['AED', 'USD', 'EUR', 'TRY', 'CNY'];

export const COUNTRIES = [
  'UAE', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Qatar', 'Oman',
  'Germany', 'USA', 'UK', 'France', 'Italy', 'Spain', 'Turkey',
  'China', 'India', 'Egypt', 'Jordan',
];
