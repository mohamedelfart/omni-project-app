import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Badge } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { featuredProperties } from '../../data/mock';
import { useSessionStore } from '../../store/session.store';
import { mobileTheme } from '../../theme';

export function PropertyDetailsScreen() {
  const navigation = useNavigation<any>();
  const propertyId = useSessionStore((state) => state.selectedPropertyId) ?? 'prop_1';
  const property = featuredProperties.find((item) => item.id === propertyId) ?? featuredProperties.at(0);

  if (!property) {
    return (
      <FeatureShell title="Property" subtitle="No property data available" badge="Property Details">
        <Card>
          <Text style={styles.text}>No properties found.</Text>
        </Card>
      </FeatureShell>
    );
  }

  return (
    <FeatureShell title={property.title} subtitle={property.summary} badge="Property Details">
      <Card>
        <View style={styles.section}>
          <Badge label={property.rent} tone="success" />
          <Text style={styles.meta}>{property.district}</Text>
          <Text style={styles.text}>Concierge, gym, route planning, live pickup readiness, and booking progression are all available from this view.</Text>
          <Button label="Book Viewing Trip" onPress={() => navigation.navigate('ViewingTrip')} />
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: mobileTheme.spacing.sm },
  meta: { color: mobileTheme.colors.primary, fontWeight: '700', fontSize: 16 },
  text: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});