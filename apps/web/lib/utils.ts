import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a Solana wallet address for compact UI display
 */
export const truncateWallet = (address: string, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Format SOL amount with consistent decimals
 */
export const formatSol = (amount: number) => {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};
