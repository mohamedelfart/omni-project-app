import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BadgeTone = 'info' | 'success' | 'warning' | 'danger';

const buttonPalette: Record<ButtonVariant, { backgroundColor: string; color: string; borderColor: string }> = {
  primary: { backgroundColor: colors.primary, color: colors.card, borderColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft, color: colors.primary, borderColor: colors.primarySoft },
  ghost: { backgroundColor: 'transparent', color: colors.primary, borderColor: colors.border },
  danger: { backgroundColor: colors.danger, color: colors.card, borderColor: colors.danger },
};

const badgePalette: Record<BadgeTone, { backgroundColor: string; color: string }> = {
  info: { backgroundColor: '#DBEAFE', color: colors.info },
  success: { backgroundColor: '#DCFCE7', color: colors.success },
  warning: { backgroundColor: '#FEF3C7', color: colors.warning },
  danger: { backgroundColor: '#FEE2E2', color: colors.danger },
};

export function IconWrapper({ children }: { children: ReactNode }) {
  return <View style={styles.iconWrapper}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const palette = buttonPalette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: palette.color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
}: {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

export function ScreenContainer({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Badge({ label, tone = 'info' }: { label: string; tone?: BadgeTone }) {
  const palette = badgePalette[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.badgeLabel, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <View style={styles.stateBlock}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateDescription}>{description}</Text>
      </View>
    </Card>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function TabSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.tabWrap}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.tabItem, active ? styles.tabItemActive : undefined]}
          >
            <Text style={[styles.tabLabel, active ? styles.tabLabelActive : undefined]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: shadows.card.shadowColor,
    shadowOffset: shadows.card.shadowOffset,
    shadowOpacity: shadows.card.shadowOpacity,
    shadowRadius: shadows.card.shadowRadius,
    elevation: shadows.card.elevation,
  },
  button: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: {
    ...typography.bodyStrong,
  },
  inputWrap: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  input: {
    color: colors.text,
    fontSize: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeLabel: {
    ...typography.caption,
  },
  stateBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateTitle: {
    ...typography.heading3,
    color: colors.text,
  },
  stateDescription: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  loadingLabel: {
    ...typography.body,
    color: colors.secondary,
  },
  tabWrap: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    padding: spacing.xs,
    backgroundColor: colors.primarySoft,
    gap: spacing.xs,
  },
  tabItem: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: colors.card,
    shadowColor: shadows.soft.shadowColor,
    shadowOffset: shadows.soft.shadowOffset,
    shadowOpacity: shadows.soft.shadowOpacity,
    shadowRadius: shadows.soft.shadowRadius,
    elevation: shadows.soft.elevation,
  },
  tabLabel: {
    ...typography.caption,
    color: colors.secondary,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});