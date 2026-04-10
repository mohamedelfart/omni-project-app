import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { getPropertiesByIds, usePropertyUiStore } from '../../store/property-ui.store';
import { mobileTheme } from '../../theme';

export function BookingConfirmationScreen() {
  const reservedUnitIds = usePropertyUiStore((state) => state.reservedUnitIds);
  const removeReservedUnit = usePropertyUiStore((state) => state.removeReservedUnit);

  const items = getPropertiesByIds(reservedUnitIds);

  return (
    <FeatureShell title="Reserved Units" subtitle="Your reserved homes are listed here for follow-up decisions." badge="Reserved">
      {!items.length ? (
        <EmptyState title="No reserved units yet" description="Reserve a unit from Property Details and it will appear here." />
      ) : null}

      {items.map((property) => (
        <View key={property.id} style={styles.card}>
          <Image source={{ uri: property.images[0] }} style={styles.image} resizeMode="cover" />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{property.location}</Text>
            <Text style={styles.price}>{property.price}</Text>
            <Text style={styles.meta}>{property.bedrooms} bed • {property.bathrooms} bath • {property.sizeSqm} sqm</Text>
            <TouchableOpacity onPress={() => removeReservedUnit(property.id)} activeOpacity={0.85}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE6F2',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  image: { width: '100%', height: 150, borderRadius: 12 },
  copy: { gap: 4 },
  title: { color: '#1F2937', fontSize: 17, fontWeight: '700' },
  meta: { color: '#6B7280', fontSize: 12 },
  price: { color: '#2F80ED', fontSize: 14, fontWeight: '700' },
  remove: { color: '#5A79A6', fontSize: 12, fontWeight: '700', marginTop: 2 },
});
