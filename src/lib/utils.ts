import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    calendar: 'gregory'
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    calendar: 'gregory',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date));
}

export function formatDateOnly(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    calendar: 'gregory',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    calendar: 'gregory',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date));
}

export function formatTimeOnly(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    calendar: 'gregory',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
}

export function formatDateTimeDetailed(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    calendar: 'gregory',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'غداً';
  if (diffDays === -1) return 'أمس';
  if (diffDays > 1 && diffDays <= 7) return `خلال ${diffDays} أيام`;
  if (diffDays < -1 && diffDays >= -7) return `منذ ${Math.abs(diffDays)} أيام`;
  
  // Use regular date format for dates far in the past or future
  return formatDateOnly(date);
}