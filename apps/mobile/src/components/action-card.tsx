import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mobileTheme } from '../theme';

type ActionCardProps = {
  icon: string;
  title: string;
  subtitle?: string;
  featured?: boolean;
  onPress?: () => void;
};

export function ActionCard({ icon, title, subtitle, featured = false, onPress }: ActionCardProps) {
  return (
    <Pressable onPress={onPress} style={[styles.card, featured ? styles.cardFeatured : undefined]}>
      <View style={[styles.iconWrap, featured ? styles.iconWrapFeatured : undefined]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    backgroundColor: mobileTheme.colors.white,
    borderRadius: mobileTheme.radii.lg,
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.neutral100,
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.06)',
  },
  cardFeatured: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFeatured: {
    backgroundColor: '#FFEDD5',
  },
  icon: {
    fontSize: 20,
  },
  title: {
    color: mobileTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: mobileTheme.colors.neutral600,
    fontSize: 13,
    lineHeight: 18,
  },
});
