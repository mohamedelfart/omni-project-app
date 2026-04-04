import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ScreenContainer } from '@quickrent/design-system';

import { mobileTheme } from '../../theme';

export function ForgotPasswordScreen() {
  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Recovery is built into the account lifecycle, not treated as an afterthought.</Text>
      </View>
      <Card>
        <View style={styles.form}>
          <Input placeholder="Email" />
          <Button label="Send Reset Link" />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: mobileTheme.spacing.sm, marginTop: 48 },
  title: { color: mobileTheme.colors.primary, fontSize: 30, fontWeight: '700' },
  subtitle: { color: mobileTheme.colors.secondary, fontSize: 15, lineHeight: 22 },
  form: { gap: mobileTheme.spacing.md },
});