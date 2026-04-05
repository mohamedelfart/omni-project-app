import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, LoadingState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { getTranslator } from '../../lib/language';
import { confirmViewingProperty as confirmViewingPropertyApi, getViewingRequestById, listViewingRequests, ViewingRequest } from '../../lib/viewing-api';
import { useSessionStore } from '../../store/session.store';
import { mobileTheme } from '../../theme';

export function ViewingTripScreen() {
  const navigation = useNavigation<any>();
  const locale = useSessionStore((state) => state.locale);
  const t = getTranslator(locale);
  const [request, setRequest] = useState<ViewingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      }

      try {
        const list = await listViewingRequests();
        const safeList = Array.isArray(list) ? list : [];
        const latest = safeList[0];

        if (!latest) {
          if (!cancelled) {
            setRequest(null);
          }
          return;
        }

        const result = await getViewingRequestById(latest.id);
        if (!cancelled) {
          setRequest(result);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t('viewing.error.load', 'Unable to load viewing status.'));
        }
      } finally {
        if (isInitialLoad && !cancelled) {
          setLoading(false);
        }
      }
    };

    void load(true);
    const interval = setInterval(() => {
      void load();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const confirmedViewingPropertyId = request?.selectedPropertyIds?.[0];
  const statusLabel = request?.unifiedRequest.status ?? 'SUBMITTED';
  const ticketCode = request?.unifiedRequest.metadata?.ticketCode ?? request?.unifiedRequest.id;
  const pickupLabel = request?.unifiedRequest.metadata?.locationLabel ?? t('viewing.pickupFallback', 'Tenant live location');

  return (
    <FeatureShell
      title={t('viewing.shell.title', 'Viewing Trip')}
      subtitle={t('viewing.shell.subtitle', 'Tenant to core to command center and provider routing, with pickup, ETA, and multi-stop visibility.')}
      badge={t('viewing.shell.badge', 'Trip Tracking')}
    >
      {loading ? <LoadingState label={t('viewing.loading', 'Requesting your viewing trip')} /> : null}
      {!loading && !request ? (
        <EmptyState
          title={t('viewing.empty.title', 'No viewing trip yet')}
          description={t('viewing.empty.description', 'Start from Property Search, choose up to three homes, then request viewing.')}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <View style={styles.tripCard}>
          <Badge
            label={request?.assignment
              ? `${t('viewing.badge.vendorAssigned', 'Vendor assigned')} • ${t('viewing.eta', 'ETA')} ${request.assignment.etaMinutes ?? 0} min`
              : t('viewing.badge.awaitingAssignment', 'Awaiting assignment')}
            tone="success"
          />
          <Text style={styles.title}>{t('viewing.title', 'Pickup ready for shortlisted homes')}</Text>
          <Text style={styles.text}>{t('viewing.flow', 'Tenant -> Core -> Command Center -> Nearest Vendor')}</Text>
          <Text style={styles.subheader}>{t('viewing.tripTicket', 'Trip ticket')}</Text>
          <Text style={styles.text}>{ticketCode ?? t('viewing.ticketGenerating', 'Generating ticket')}</Text>
          <Text style={styles.text}>{t('viewing.status.current', 'Current status:')} {statusLabel}</Text>
          <Text style={styles.text}>{t('viewing.pickup', 'Pickup:')} {pickupLabel}</Text>
          {request?.assignment?.provider ? <Text style={styles.text}>{t('viewing.assignedVendor', 'Assigned vendor:')} {request.assignment.provider.name}</Text> : null}
          <Text style={styles.subheader}>{t('viewing.stops', 'Stops')}</Text>
          {request?.items.map((item, index) => (
            <View key={item.property.id} style={styles.stopRow}>
              <View style={styles.stopCopy}>
                <Text style={styles.stopTitle}>{t('viewing.stop', 'Stop')} {index + 1}: {item.property.title}</Text>
                <Text style={styles.text}>{item.property.district ?? item.property.city} • QAR {(item.property.monthlyRentMinor / 100).toLocaleString()} {t('viewing.monthly', '/ month')}</Text>
              </View>
              <Button
                label={confirmedViewingPropertyId === item.property.id
                  ? t('viewing.selected', 'Selected')
                  : t('viewing.choose', 'Choose')}
                variant={confirmedViewingPropertyId === item.property.id ? 'secondary' : 'primary'}
                onPress={async () => {
                  if (!request) return;
                  try {
                    const result = await confirmViewingPropertyApi(request.id, item.property.id);
                    setRequest(result);
                    setError(null);
                  } catch {
                    setError(t('viewing.error.confirm', 'Unable to confirm property selection.'));
                  }
                }}
              />
            </View>
          ))}
          {request?.unifiedRequest.trackingEvents?.length ? (
            <>
              <Text style={styles.subheader}>{t('viewing.liveUpdates', 'Live updates')}</Text>
              {request.unifiedRequest.trackingEvents.slice(0, 4).map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.text}>{event.status}</Text>
                  {event.description ? <Text style={styles.text}>{event.description}</Text> : null}
                </View>
              ))}
            </>
          ) : null}
          <Button
            label={t('viewing.continueToPayment', 'Continue to Payment')}
            disabled={!confirmedViewingPropertyId}
            onPress={() => navigation.navigate('Payments')}
          />
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
  eventRow: { gap: mobileTheme.spacing.xs, paddingVertical: mobileTheme.spacing.xs },
  eventTitle: { color: mobileTheme.colors.primary, fontWeight: '700' },
  error: { color: '#B91C1C' },
});