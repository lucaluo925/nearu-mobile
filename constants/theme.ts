/**
 * NearU mobile design tokens.
 * All spacing, colors, and typography live here.
 * Never hard-code values in component files.
 */

export const Colors = {
  // Brand
  amber:        '#F59E0B',
  amberLight:   '#FEF3C7',
  amberDark:    '#D97706',

  // Neutrals
  white:        '#FFFFFF',
  background:   '#F9FAFB',
  surface:      '#FFFFFF',
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',

  // Text
  text:         '#111827',
  textSecondary:'#6B7280',
  textTertiary: '#9CA3AF',
  textInverse:  '#FFFFFF',

  // Semantic
  success:      '#10B981',
  error:        '#EF4444',
  warning:      '#F59E0B',
  info:         '#3B82F6',

  // Category chips
  chipBg:       '#F3F4F6',
  chipBgActive: '#FEF3C7',
  chipText:     '#6B7280',
  chipTextActive:'#92400E',

  // Tab bar
  tabActive:    '#F59E0B',
  tabInactive:  '#9CA3AF',
  tabBg:        '#FFFFFF',
} as const

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 9999,
} as const

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  28,
  xxxl: 34,
} as const

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
}

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
} as const
