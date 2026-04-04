import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';

export function InsuranceScreen() {
  return (
    <FeatureShell title="Insurance" subtitle="Plans, subscriptions, claim handling, and country-aware coverage structures." badge="Protection">
      <Card>
        <View style={styles.block}>
          <Badge label="Rent Protect Plus" tone="info" />
          <Text style={styles.text}>Active policy with coverage visibility, claims readiness, and provider-backed plan management.</Text>
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({ block: { gap: mobileTheme.spacing.sm }, text: { color: mobileTheme.colors.secondary, lineHeight: 22 } });