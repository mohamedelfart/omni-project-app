import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';

export function ViewingTripScreen() {
  const navigation = useNavigation<any>();

  return (
    <FeatureShell title="Viewing Trip" subtitle="Tenant to core to command center and provider routing, with pickup, ETA, and multi-stop visibility." badge="Trip Tracking">
      <Card>
        <View style={styles.tripCard}>
          <Badge label="Driver assigned • ETA 12 min" tone="success" />
          <Text style={styles.title}>Pickup at West Bay</Text>
          <Text style={styles.text}>3-property trip planned with command center monitoring and fallback provider readiness.</Text>
          <Button label="Proceed to Booking" onPress={() => navigation.navigate('BookingConfirmation')} />
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  tripCard: { gap: mobileTheme.spacing.sm },
  title: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '700' },
  text: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});