import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mobileTheme } from '../theme';

type ActionCardProps = {
  icon: string;
  title: string;
  onPress?: () => void;
};

export function ActionCard({ icon, title, onPress }: ActionCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  title: {
    color: mobileTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
