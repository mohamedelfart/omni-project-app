import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { createViewingRequest, getShortlist, removeFromShortlist, ViewingShortlistItem } from '../../lib/viewing-api';
import { useSessionStore } from '../../store/session.store';
import { mobileTheme } from '../../theme';

export function ShortlistScreen() {
  const navigation = useNavigation<any>();
  const [isRequesting, setIsRequesting] = useState(false);
  const [items, setItems] = useState<ViewingShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setActiveViewingRequestId = useSessionStore((state) => state.setActiveViewingRequestId);

  const loadShortlist = async () => {
    setLoading(true);
    setError(null);

    try {
      const shortlist = await getShortlist();
      setItems(shortlist.items);
    } catch {
      setError('Could not load shortlist. Check API connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShortlist();
  }, []);

  const requestViewingTrip = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const request = await createViewingRequest({
        preferredDateISO: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        pickupLat: 25.2854,
        pickupLng: 51.531,
        notes: 'Tenant mobile viewing request',
      });

      setActiveViewingRequestId(request.id);
      navigation.navigate('ViewingTrip');
    } catch {
      setError('Could not create viewing request.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRemove = async (propertyId: string) => {
    setError(null);
    try {
      const shortlist = await removeFromShortlist(propertyId);
      setItems(shortlist.items);
    } catch {
      setError('Could not remove property from shortlist.');
    }
  };

  return (
    <FeatureShell title="Shortlist" subtitle="Up to three properties can be carried into compare and routed trip planning." badge="Max 3">
      {loading ? <Text style={styles.position}>Loading shortlist...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !items.length ? (
        <EmptyState title="No homes shortlisted yet" description="Select up to 3 properties from search, then request a guided viewing trip." />
      ) : null}
      {items.map((item, index) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.position}>Stop {index + 1}</Text>
              <Text style={styles.title}>{item.property.title}</Text>
            </View>
            <View style={styles.sideActions}>
              <Text style={styles.meta}>QAR {(item.property.monthlyRentMinor / 100).toLocaleString()} / month</Text>
              <Button label="Remove" variant="ghost" onPress={() => handleRemove(item.propertyId)} />
            </View>
          </View>
        </Card>
      ))}
      <Button label="Compare Properties" variant="secondary" disabled={items.length < 2} onPress={() => navigation.navigate('Compare')} />
      <Button label={isRequesting ? 'Requesting' : 'Request Viewing'} disabled={!items.length || isRequesting} onPress={requestViewingTrip} />
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sideActions: { alignItems: 'flex-end', gap: mobileTheme.spacing.xs },
  position: { color: mobileTheme.colors.secondary },
  title: { color: mobileTheme.colors.primary, fontSize: 18, fontWeight: '700' },
  meta: { color: mobileTheme.colors.accent, fontWeight: '700' },
  error: { color: '#B91C1C' },
});