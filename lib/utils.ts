import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(millimes: number): string {
  const dinars = millimes / 1000;
  return `${dinars.toFixed(3)} TND`;
}

export function calculateCommission(amount: number): number {
  return Math.round(amount * 0.05);
}
