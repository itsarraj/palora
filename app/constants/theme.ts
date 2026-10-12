export { brand, colors } from '@/constants/brand';

export const PLACEHOLDER_PALETTE = [
  '#4B164C',
  '#DD88CF',
  '#8B5A8C',
  '#C478B0',
  '#6B3A6C',
  '#E8A8D8',
] as const;

export function placeholderColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_PALETTE[h % PLACEHOLDER_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
