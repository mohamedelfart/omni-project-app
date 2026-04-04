import { FeatureShell } from '../../components/shell/feature-shell';
import { Card } from '@quickrent/design-system';
import { Text } from 'react-native';

export function MoveInScreen() {
  return (
    <FeatureShell title="Move-In Service" subtitle="Free service with a QAR 500 cap, provider assignment, and fallback orchestration." badge="Free up to QAR 500">
      <Card><Text>Move date, pickup, drop-off, estimate, and core-routed execution.</Text></Card>
    </FeatureShell>
  );
}