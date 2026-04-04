import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';

export function RewardsScreen() {
  return (
    <FeatureShell title="Rewards" subtitle="Wallet balance, offer eligibility, and operationally controlled discounting from the command center." badge="Gold Tier">
      <Card>
        <View style={styles.block}>
          <Badge label="1,250 points" tone="warning" />
          <Text style={styles.text}>Use points on paid services, upgrades, and strategic offers issued from the command center.</Text>
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({ block: { gap: mobileTheme.spacing.sm }, text: { color: mobileTheme.colors.secondary, lineHeight: 22 } });