import { FeatureShell } from '../../components/shell/feature-shell';
import { Card } from '@quickrent/design-system';
import { Text } from 'react-native';

export function PaidServicesScreen() {
  return (
    <FeatureShell title="Paid Services" subtitle="Ride, food, grocery, laundry, and future integrations routed through core and mirrored to command center." badge="External Integrations">
      <Card><Text>Third-party service requests still create unified internal tickets before vendor dispatch.</Text></Card>
    </FeatureShell>
  );
}