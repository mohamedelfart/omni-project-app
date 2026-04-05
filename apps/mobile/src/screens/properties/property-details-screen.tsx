import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Badge, LoadingState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { PropertyMapCard } from '../../components/property-map-card';
import { getTranslator } from '../../lib/language';
import { addToShortlist, getPropertyById, PropertySearchResult } from '../../lib/viewing-api';
import { useSessionStore } from '../../store/session.store';
import { mobileTheme } from '../../theme';

export function PropertyDetailsScreen() {
  const navigation = useNavigation<any>();
  const propertyId = useSessionStore((state) => state.selectedPropertyId) ?? 'prop_1';
  const locale = useSessionStore((state) => state.locale);
  const t = getTranslator(locale);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertySearchResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await getPropertyById(propertyId);
        if (!cancelled) {
          setProperty(result);
        }
      } catch {
        if (!cancelled) {
          setProperty(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <FeatureShell
        title={t('property.shell.title', 'Property')}
        subtitle={t('property.shell.loadingSubtitle', 'Loading property from QuickRent Core')}
        badge={t('property.shell.badge', 'Property Details')}
      >
        <LoadingState label={t('property.loading', 'Loading property details')} />
      </FeatureShell>
    );
  }

  if (!property) {
    return (
      <FeatureShell
        title={t('property.shell.title', 'Property')}
        subtitle={t('property.shell.emptySubtitle', 'No property data available')}
        badge={t('property.shell.badge', 'Property Details')}
      >
        <Card>
          <Text style={styles.text}>{t('property.empty', 'No properties found.')}</Text>
        </Card>
      </FeatureShell>
    );
  }

  return (
    <FeatureShell
      title={property.title}
      subtitle={property.description ?? t('property.subtitleFallback', 'Property details')}
      badge={t('property.shell.badge', 'Property Details')}
    >
      <Card>
        <View style={styles.section}>
          <Badge
            label={`QAR ${((property.monthlyRentMinor ?? 0) / 100).toLocaleString()} ${t('property.monthly', '/ month')}`}
            tone="success"
          />
          <Text style={styles.meta}>{property.district ?? property.city}</Text>
          <Text style={styles.text}>{t('property.valueText', 'Concierge, gym, route planning, live pickup readiness, and booking progression are all available from this view.')}</Text>
          <Button
            label={added
              ? t('property.button.inShortlist', 'In shortlist')
              : (adding ? t('property.button.adding', 'Adding') : t('property.button.addToShortlist', 'Add to shortlist'))}
            disabled={added || adding}
            onPress={async () => {
              setAdding(true);
              try {
                await addToShortlist(property.id);
                setAdded(true);
              } finally {
                setAdding(false);
              }
            }}
          />
          <Button
            label={t('property.button.openShortlist', 'Open shortlist')}
            variant="secondary"
            onPress={() => navigation.navigate('Shortlist')}
          />
        </View>
      </Card>
      {property.lat != null && property.lng != null && (
        <PropertyMapCard
          lat={property.lat}
          lng={property.lng}
          addressLine1={property.addressLine1}
          city={property.city}
          district={property.district}
          title={property.title}
        />
      )}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: mobileTheme.spacing.sm },
  meta: { color: mobileTheme.colors.primary, fontWeight: '700', fontSize: 16 },
  text: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});