import { useNavigation } from '@react-navigation/native';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { getPropertiesByIds, usePropertyUiStore } from '../../store/property-ui.store';
import { mobileTheme } from '../../theme';

export function CompareScreen() {
  const navigation = useNavigation<any>();
  const savedUnitIds = usePropertyUiStore((state) => state.savedUnitIds);
  const reserveUnit = usePropertyUiStore((state) => state.reserveUnit);

  const items = getPropertiesByIds(savedUnitIds);

  return (
    <FeatureShell title="Compare" subtitle="Compare your saved homes side-by-side before deciding." badge="Decision Engine">
      {items.length < 2 ? (
        <EmptyState title="Add at least two saved units" description="Save homes from Property Search, then compare them here." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compareRow}>
          {items.map((property) => (
            <View key={property.id} style={styles.compareCard}>
              <Image source={{ uri: property.images[0] }} style={styles.image} resizeMode="cover" />
              <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
              <Text style={styles.meta} numberOfLines={1}>{property.location}</Text>
              <Text style={styles.price}>{property.price}</Text>
              <Text style={styles.meta}>{property.bedrooms} bed • {property.bathrooms} bath</Text>
              <Text style={styles.meta}>{property.sizeSqm} sqm • {property.furnished === 'Yes' ? 'Furnished' : 'Unfurnished'}</Text>
              <Text style={styles.highlights} numberOfLines={2}>{property.highlights.join(' • ')}</Text>

              <TouchableOpacity
                style={styles.reserveBtn}
                onPress={() => {
                  reserveUnit(property.id);
                  navigation.navigate('BookingConfirmation');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.reserveBtnText}>Reserve</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  compareRow: { gap: mobileTheme.spacing.sm, paddingBottom: 4 },
  compareCard: {
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBE6F2',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 6,
  },
  image: { width: '100%', height: 128, borderRadius: 12 },
  title: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  meta: { color: '#6B7280', fontSize: 12 },
  price: { color: '#2F80ED', fontSize: 14, fontWeight: '700' },
  highlights: { color: '#4D617A', fontSize: 12, lineHeight: 18 },
  reserveBtn: {
    marginTop: 4,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
