import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, TabSwitch } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { featuredProperties } from '../../data/mock';
import { mobileTheme } from '../../theme';
import { useSessionStore } from '../../store/session.store';

export function PropertySearchScreen() {
  const navigation = useNavigation<any>();
  const setSelectedPropertyId = useSessionStore((state) => state.setSelectedPropertyId);

  return (
    <FeatureShell title="Property Search" subtitle="Map-ready search, premium filters, shortlist control, and routed viewing requests." badge="Search">
      <TabSwitch value="map" options={[{ label: 'Map', value: 'map' }, { label: 'List', value: 'list' }]} onChange={() => undefined} />
      {featuredProperties.map((property) => (
        <Card key={property.id}>
          <View style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.title}>{property.title}</Text>
              <Text style={styles.meta}>{property.district} • {property.rent}</Text>
              <Text style={styles.summary}>{property.summary}</Text>
            </View>
            <View style={styles.actions}>
              <Button label="Details" variant="secondary" onPress={() => { setSelectedPropertyId(property.id); navigation.navigate('PropertyDetails'); }} />
              <Button label="Shortlist" onPress={() => navigation.navigate('Shortlist')} />
            </View>
          </View>
        </Card>
      ))}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: mobileTheme.spacing.md },
  copy: { gap: mobileTheme.spacing.xs },
  title: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '700' },
  meta: { color: mobileTheme.colors.accent, fontWeight: '600' },
  summary: { color: mobileTheme.colors.secondary, lineHeight: 22 },
  actions: { gap: mobileTheme.spacing.sm },
});