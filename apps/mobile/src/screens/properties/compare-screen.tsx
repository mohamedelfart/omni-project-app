import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { featuredProperties } from '../../data/mock';
import { mobileTheme } from '../../theme';

export function CompareScreen() {
  return (
    <FeatureShell title="Compare" subtitle="A single comparison surface across price, area, district, and service benefits." badge="Compare">
      {featuredProperties.slice(0, 3).map((property) => (
        <Card key={property.id}>
          <View style={styles.card}>
            <Text style={styles.title}>{property.title}</Text>
            <Text style={styles.meta}>{property.district}</Text>
            <Text style={styles.meta}>{property.rent}</Text>
          </View>
        </Card>
      ))}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: mobileTheme.spacing.xs },
  title: { color: mobileTheme.colors.primary, fontSize: 18, fontWeight: '700' },
  meta: { color: mobileTheme.colors.secondary },
});