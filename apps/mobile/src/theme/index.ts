import { colors, radii, spacing, typography } from '@quickrent/design-system';

export const mobileTheme = {
  colors: {
    ...colors,
    brandNavy: colors.primary,
    brandOrange: colors.accent,
    white: colors.card,
    neutral100: colors.border,
    neutral600: colors.secondary,
  },
  spacing,
  radii,
  typography,
  gradients: {
    appBackground: ['#F8FAFC', '#FFFFFF'],
    premiumCard: ['#FFFFFF', '#F7FAFD'],
  },
};
