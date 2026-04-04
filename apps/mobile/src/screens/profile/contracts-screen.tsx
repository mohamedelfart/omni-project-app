import { Text } from 'react-native';

import { Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';

export function ContractsScreen() {
  return (
    <FeatureShell title="Contracts and Documents" subtitle="Booking contracts, invoices, proof files, and service completion records." badge="Documents">
      <Card><Text>Lease agreement, invoice archive, proof of completion, and service history live here.</Text></Card>
    </FeatureShell>
  );
}