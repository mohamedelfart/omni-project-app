import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';

export function BookingConfirmationScreen() {
  const navigation = useNavigation<any>();

  return (
    <FeatureShell title="Booking Confirmation" subtitle="Selected property, contract flow, payment progression, and eligibility for services after confirmation." badge="Booking">
      <Card>
        <View style={styles.block}>
          <Badge label="Doha Marina Residence" tone="info" />
          <Text style={styles.text}>Deposit, rent, and service fees are bundled into a transparent confirmation flow with invoice generation.</Text>
          <Button label="Proceed to Payment" onPress={() => navigation.navigate('Payments')} />
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  block: { gap: mobileTheme.spacing.sm },
  text: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});