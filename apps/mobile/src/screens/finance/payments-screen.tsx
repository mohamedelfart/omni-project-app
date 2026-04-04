import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';

export function PaymentsScreen() {
  return (
    <FeatureShell title="Payments" subtitle="Booking, invoices, payment status, and lifecycle visibility for both tenant and command center." badge="Finance">
      <Card>
        <View style={styles.block}>
          <Badge label="Invoice INV-2026-041" tone="success" />
          <Text style={styles.title}>QAR 17,000 authorized</Text>
          <Text style={styles.text}>Booking deposit and first month collected with invoice and payment visibility synced back to core.</Text>
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  block: { gap: mobileTheme.spacing.sm },
  title: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '700' },
  text: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});