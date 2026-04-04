import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ScreenContainer } from '@quickrent/design-system';

import { mobileTheme } from '../../theme';
import { useSessionStore } from '../../store/session.store';

export function OtpLoginScreen() {
  const signInAsTenant = useSessionStore((state) => state.signInAsTenant);

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Phone number and OTP</Text>
        <Text style={styles.subtitle}>QuickRent supports secure phone login with verification-ready flows and global market expansion in mind.</Text>
      </View>
      <Card>
        <View style={styles.form}>
          <Input placeholder="Phone number" />
          <Input placeholder="OTP code" />
          <Button label="Verify and Continue" onPress={signInAsTenant} />
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