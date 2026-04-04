import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, LoadingState, TabSwitch } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { addToShortlist, getShortlist, listProperties, PropertySearchResult } from '../../lib/viewing-api';
import { mobileTheme } from '../../theme';
import { useSessionStore } from '../../store/session.store';

export function PropertySearchScreen() {
  const navigation = useNavigation<any>();
  const setSelectedPropertyId = useSessionStore((state) => state.setSelectedPropertyId);
  const [properties, setProperties] = useState<PropertySearchResult[]>([]);
  const [shortlistedPropertyIds, setShortlistedPropertyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortlistLoadingId, setShortlistLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const [propertiesResult, shortlistResult] = await Promise.all([
        listProperties(),
        getShortlist(),
      ]);

      setProperties(propertiesResult);
      setShortlistedPropertyIds(shortlistResult.items.map((item) => item.propertyId));
    } catch {
      setError('Unable to load search data. Please make sure your tenant token and API are available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const shortlistStatusLabel = useMemo(() => `${shortlistedPropertyIds.length} of 3 homes selected for viewing.`, [shortlistedPropertyIds.length]);

  const handleAddToShortlist = async (propertyId: string) => {
    setShortlistLoadingId(propertyId);
    try {
      await addToShortlist(propertyId);
      const shortlist = await getShortlist();
      setShortlistedPropertyIds(shortlist.items.map((item) => item.propertyId));
    } catch {
      setError('Could not add property to shortlist.');
    } finally {
      setShortlistLoadingId(null);
    }
  };

  return (
    <FeatureShell title="Property Search" subtitle="Map-ready search, premium filters, shortlist control, and routed viewing requests." badge="Search">
      {loading ? <LoadingState label="Searching premium homes in Qatar" /> : null}
      <TabSwitch value="map" options={[{ label: 'Map', value: 'map' }, { label: 'List', value: 'list' }]} onChange={() => undefined} />
      <Card>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Shortlist status</Text>
          <Text style={styles.summaryText}>{shortlistStatusLabel}</Text>
          <Button label={shortlistedPropertyIds.length ? 'Request Viewing' : 'Select Homes'} disabled={!shortlistedPropertyIds.length} onPress={() => navigation.navigate('Shortlist')} />
        </View>
      </Card>
      {error ? <EmptyState title="Connection issue" description={error} /> : null}
      {!loading && properties.length === 0 ? <EmptyState title="No properties found" description="Try adjusting search filters and refresh." /> : null}
      {properties.map((property) => (
        <Card key={property.id}>
          <View style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.title}>{property.title}</Text>
              <Text style={styles.meta}>{property.district ?? property.city} • QAR {(property.monthlyRentMinor / 100).toLocaleString()} / month</Text>
              <Text style={styles.summary}>{property.description}</Text>
              <Text style={styles.secondary}>{property.bedrooms} bed • {property.areaSqm} sqm • {property.city}</Text>
            </View>
            <View style={styles.actions}>
              <Button label="Details" variant="secondary" onPress={() => { setSelectedPropertyId(property.id); navigation.navigate('PropertyDetails'); }} />
              <Button
                label={shortlistedPropertyIds.includes(property.id) ? 'Added' : (shortlistLoadingId === property.id ? 'Adding' : 'Add to shortlist')}
                disabled={shortlistedPropertyIds.includes(property.id) || (!shortlistedPropertyIds.includes(property.id) && shortlistedPropertyIds.length >= 3) || shortlistLoadingId === property.id}
                onPress={() => handleAddToShortlist(property.id)}
              />
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
  secondary: { color: mobileTheme.colors.neutral600 },
  actions: { gap: mobileTheme.spacing.sm },
  summaryCard: { gap: mobileTheme.spacing.sm },
  summaryTitle: { color: mobileTheme.colors.primary, fontSize: 18, fontWeight: '700' },
  summaryText: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});