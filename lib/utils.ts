import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize region value - converts 'global' to null, otherwise returns as-is
 * Client-safe utility function
 */
export function normalizeRegion(region: string | null | undefined): string | null {
  if (region === null || region === undefined || region === 'global' || region === '') {
    return null
  }
  return region
}

/**
 * Determine region type based on region code
 * Client-safe utility function
 */
export function getRegionType(region: string | null): 'city' | 'country' | null {
  if (!region || region === 'global') {
    return null
  }
  // Heuristic: 2-letter codes are typically countries, longer codes are cities
  return region.length === 2 ? 'country' : 'city'
}

