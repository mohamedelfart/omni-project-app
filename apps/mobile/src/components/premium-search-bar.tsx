import { StyleSheet, TextInput, View } from 'react-native';

import { mobileTheme } from '../theme';

type PremiumSearchBarProps = {
  placeholder: string;
};

export function PremiumSearchBar({ placeholder }: PremiumSearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput placeholder={placeholder} placeholderTextColor={mobileTheme.colors.secondary} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: mobileTheme.radii.xl,
    backgroundColor: mobileTheme.colors.white,
    borderColor: mobileTheme.colors.neutral100,
    borderWidth: 1,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: 14,
    boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.05)',
  },
  input: {
    color: mobileTheme.colors.text,
  },
});
