import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { createViewingRequest, getShortlist, removeFromShortlist, ViewingShortlistItem } from '../../lib/viewing-api';
import { mobileTheme } from '../../theme';

export function ShortlistScreen() {
  const navigation = useNavigation<any>();
  const [isRequesting, setIsRequesting] = useState(false);
  const [items, setItems] = useState<ViewingShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      navigation.push('ViewingTrip');
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
    <FeatureShell title="FREE Viewing Experience" subtitle="We pick you up, show you the home, and bring you back" badge="FREE SERVICE">
      {loading ? <Text style={styles.position}>Loading shortlist...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {error ? <Button label="Retry" variant="secondary" onPress={() => void loadShortlist()} /> : null}
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
      {!!items.length ? (
        <Card>
          <View style={styles.benefitsBlock}>
            <View style={styles.freeBadgePill}>
              <Text style={styles.freeBadgeText}>FREE SERVICE</Text>
            </View>
            <Text style={styles.benefitLine}>✔ Free driver to the property</Text>
            <Text style={styles.benefitLine}>✔ Guided tour with our agent</Text>
            <Text style={styles.benefitLine}>✔ No commitment required</Text>
            <Text style={styles.supportText}>No payment required for this visit</Text>
          </View>
        </Card>
      ) : null}
      <Button label="Compare Properties" variant="secondary" disabled={items.length < 2} onPress={() => navigation.push('Compare')} />
      <Button label="Book My Free Visit" disabled={!items.length || isRequesting} onPress={requestViewingTrip} />
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sideActions: { alignItems: 'flex-end', gap: mobileTheme.spacing.xs },
  position: { color: mobileTheme.colors.secondary },
  title: { color: mobileTheme.colors.primary, fontSize: 18, fontWeight: '700' },
  meta: { color: mobileTheme.colors.accent, fontWeight: '700' },
  benefitsBlock: { gap: mobileTheme.spacing.xs },
  freeBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF3FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  freeBadgeText: {
    color: '#2159A6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  benefitLine: {
    color: mobileTheme.colors.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  supportText: {
    color: mobileTheme.colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  error: { color: '#B91C1C' },
});