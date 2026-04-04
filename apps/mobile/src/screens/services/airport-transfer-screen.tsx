import { FeatureShell } from '../../components/shell/feature-shell';
import { Card } from '@quickrent/design-system';
import { Text } from 'react-native';

export function AirportTransferScreen() {
  return (
    <FeatureShell title="Airport Transfer" subtitle="Pickup and drop-off routing, flight details, and monitored dispatch." badge="Free Service">
      <Card><Text>Flight number, terminal coordination, and provider status routed through core.</Text></Card>
    </FeatureShell>
  );
}