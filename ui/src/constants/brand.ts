/** Palora product identity — keep in sync with app/constants/brand.ts */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Palora';
export const APP_TAGLINE = 'Dating and friendship made simple';
/** Raw mark (transparent, 179×290) — header, footer, inline UI */
export const BRAND_MARK_PATH = '/brand-mark.svg';
/** Centered mark on square canvas (500×500) — app icons, press kit, favicons */
export const LOGO_PATH = '/logo.svg';
/** width / height of brand-mark.svg viewBox */
export const BRAND_MARK_ASPECT = 179 / 290;

/** Palora palette — plum #4B164C, pink #DD88CF, ink #22172A, canvas #FDF7FD */
export const brandColors = {
  bg: '#22172A',
  surface: '#2D1B36',
  surface2: '#3D2548',
  accent: '#DD88CF',
  accentHover: '#E5A4D9',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.65)',
  danger: '#E5484D',
  success: '#13E398',
} as const;

