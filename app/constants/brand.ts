/** Palora palette + size scale (same structure as job-search-app/app/constants/brand.ts).
 *  radius: chip 4 / control 8 / card 12 / panel 16 / sheet 24
 *  Tailwind: rounded / rounded-lg / rounded-xl / rounded-2xl / rounded-3xl
 *  tap 40 / control 44 / input 56 / tab 64
 */
export const brand = {
  plum: '#4B164C',
  pink: '#DD88CF',
  ink: '#22172A',
  canvas: '#FDF7FD',
  muted: '#6C727F',
  soft: '#F8E7F6',
  white: '#FFFFFF',
  border: '#E5E6EB',
  online: '#13E398',
  danger: '#E5484D',
  radius: {
    chip: 4,
    control: 8,
    card: 16,
    panel: 20,
    sheet: 24,
    pill: 32,
    full: 9999,
  },
  size: {
    tap: 40,
    control: 44,
    segmentH: 44,
    segmentPillH: 36,
    input: 56,
    tab: 64,
    avatarSm: 32,
    avatarMd: 40,
    avatarLg: 56,
    avatarXl: 64,
    avatarHero: 96,
    icon: 22,
    page: 16,
    feedCard: 343,
    actionRailW: 64,
    actionRailH: 184,
    swipeSheet: 280,
    storyRing: 64,
    storyAvatar: 56,
    storySelf: 60,
    storyBadge: 20,
    storyGap: 20,
    matchCardW: 80,
    matchCardH: 92,
  },
} as const;

/** Kept for existing `colors.plum` imports. Same values as brand. */
export const colors = {
  plum: brand.plum,
  pink: brand.pink,
  ink: brand.ink,
  canvas: brand.canvas,
  muted: brand.muted,
  soft: brand.soft,
  white: brand.white,
  online: brand.online,
} as const;
