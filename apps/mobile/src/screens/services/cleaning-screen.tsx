import { FeatureShell } from '../../components/shell/feature-shell';
import { Card } from '@quickrent/design-system';
import { Text } from 'react-native';

export function CleaningScreen() {
  return (
    <FeatureShell title="Cleaning" subtitle="Monthly included cleaning plus extra routed requests when needed." badge="Included + Extra">
      <Card><Text>Service date, duration, provider visibility, and SLA checkpoints.</Text></Card>
    </FeatureShell>
  );
}