import { FeatureShell } from '../../components/shell/feature-shell';
import { Card } from '@quickrent/design-system';
import { Text } from 'react-native';

export function MaintenanceScreen() {
  return (
    <FeatureShell title="Maintenance" subtitle="Unified ticketing with priority, status, and command center intervention." badge="Free Service">
      <Card><Text>Severity, category, preferred visit time, and live operational monitoring.</Text></Card>
    </FeatureShell>
  );
}