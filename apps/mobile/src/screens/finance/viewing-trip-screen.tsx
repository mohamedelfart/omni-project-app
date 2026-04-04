import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, LoadingState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { confirmViewingProperty as confirmViewingPropertyApi, getViewingRequestById, listViewingRequests, ViewingRequest } from '../../lib/viewing-api';
import { useSessionStore } from '../../store/session.store';
import { mobileTheme } from '../../theme';

export function ViewingTripScreen() {
  const navigation = useNavigation<any>();
  const activeViewingRequestId = useSessionStore((state) => state.activeViewingRequestId);
  const confirmedViewingPropertyId = useSessionStore((state) => state.confirmedViewingPropertyId);
  const markConfirmedViewingProperty = useSessionStore((state) => state.confirmViewingProperty);
  const setActiveViewingRequestId = useSessionStore((state) => state.setActiveViewingRequestId);
  const [request, setRequest] = useState<ViewingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeViewingRequestId) {
          const result = await getViewingRequestById(activeViewingRequestId);
          setRequest(result);
          return;
        }

        const list = await listViewingRequests();
        const latest = list[0];
        if (latest) {
          setActiveViewingRequestId(latest.id);
          setRequest(latest);
        }
      } catch {
        setError('Unable to load viewing status.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [activeViewingRequestId, setActiveViewingRequestId]);

  return (
    <FeatureShell title="Viewing Trip" subtitle="Tenant to core to command center and provider routing, with pickup, ETA, and multi-stop visibility." badge="Trip Tracking">
      {loading ? <LoadingState label="Requesting your viewing trip" /> : null}
      {!loading && !request ? <EmptyState title="No viewing trip yet" description="Start from Property Search, choose up to three homes, then request viewing." /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <View style={styles.tripCard}>
          <Badge label={request?.assignment ? `Vendor assigned • ETA ${request.assignment.etaMinutes ?? 0} min` : 'Awaiting assignment'} tone="success" />
          <Text style={styles.title}>Pickup ready for shortlisted homes</Text>
          <Text style={styles.text}>Tenant -> Core -> Command Center -> Nearest Vendor</Text>
          <Text style={styles.subheader}>Trip ticket</Text>
          <Text style={styles.text}>{request?.unifiedRequest.id ?? 'Generating ticket'}</Text>
          <Text style={styles.text}>Current status: {request?.unifiedRequest.status ?? 'SUBMITTED'}</Text>
          <Text style={styles.subheader}>Stops</Text>
          {request?.items.map((item, index) => (
            <View key={item.property.id} style={styles.stopRow}>
              <View style={styles.stopCopy}>
                <Text style={styles.stopTitle}>Stop {index + 1}: {item.property.title}</Text>
                <Text style={styles.text}>{item.property.district ?? item.property.city} • QAR {(item.property.monthlyRentMinor / 100).toLocaleString()} / month</Text>
              </View>
              <Button
                label={confirmedViewingPropertyId === item.property.id ? 'Selected' : 'Choose'}
                variant={confirmedViewingPropertyId === item.property.id ? 'secondary' : 'primary'}
                onPress={async () => {
                  if (!request) return;
                  const result = await confirmViewingPropertyApi(request.id, item.property.id);
                  markConfirmedViewingProperty(result.confirmedPropertyId);
                  setRequest(result);
                }}
              />
            </View>
          ))}
          <Button label="Continue to Payment" disabled={!confirmedViewingPropertyId} onPress={() => navigation.navigate('Payments')} />
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  tripCard: { gap: mobileTheme.spacing.sm },
  title: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '700' },
  text: { color: mobileTheme.colors.secondary, lineHeight: 22 },
  subheader: { color: mobileTheme.colors.primary, fontWeight: '700', marginTop: 4 },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: mobileTheme.spacing.sm },
  stopCopy: { flex: 1, gap: mobileTheme.spacing.xs },
  stopTitle: { color: mobileTheme.colors.primary, fontWeight: '700' },
  error: { color: '#B91C1C' },
});