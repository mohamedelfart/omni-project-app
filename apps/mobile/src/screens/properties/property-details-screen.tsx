import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { OmniButton } from '../../components/omni-button';
import { OmniSkeleton } from '../../components/omni-skeleton';
import { FeatureShell } from '../../components/shell/feature-shell';
import { getTranslator } from '../../lib/language';
import { requireAuth } from '../../lib/require-auth';
import { addToShortlist, getPropertyById, PropertySearchResult } from '../../lib/viewing-api';
import { useSessionStore } from '../../store/session.store';
import { propertyDetailsStyles as styles } from './property-details-screen.styles';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80';

export function PropertyDetailsScreen() {
  const navigation = useNavigation<any>();
  const propertyId = useSessionStore((state) => state.selectedPropertyId) ?? 'prop_1';
  const locale = useSessionStore((state) => state.locale);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const t = getTranslator(locale);

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertySearchResult | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);
  const [adding, setAdding] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

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
  }, [propertyId, retrySeed]);

  useEffect(() => {
    if (loading) {
      return;
    }

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, loading, rise]);

  if (loading) {
    return (
      <FeatureShell
        title="Property Details"
        subtitle="Curating premium specifications"
        badge="Luxury Residence"
      >
        <View style={styles.page}>
          <View style={styles.heroCard}>
            <OmniSkeleton height={230} radius={24} />
            <OmniSkeleton height={28} width="72%" style={{ marginTop: 14 }} />
            <OmniSkeleton height={16} width="40%" style={{ marginTop: 8 }} />
            <View style={styles.statsRow}>
              <OmniSkeleton height={72} radius={16} style={{ flex: 1 }} />
              <OmniSkeleton height={72} radius={16} style={{ flex: 1 }} />
              <OmniSkeleton height={72} radius={16} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </FeatureShell>
    );
  }

  if (!property) {
    return (
      <FeatureShell
        title="Property Details"
        subtitle="Data temporarily unavailable"
        badge="Luxury Residence"
      >
        <View style={styles.errorCard}>
          <Text style={styles.sectionTitle}>Unable to load property right now</Text>
          <Text style={styles.bodyText}>
            Please retry. The browsing flow remains active and your navigation stack is preserved.
          </Text>
          <OmniButton label="Retry" onPress={() => setRetrySeed((value) => value + 1)} />
        </View>
      </FeatureShell>
    );
  }

  const monthlyRent = `QAR ${((property.monthlyRentMinor ?? 0) / 100).toLocaleString()} / month`;
  const primaryImage = property.media?.find((item) => item.isPrimary)?.url ?? property.media?.[0]?.url ?? FALLBACK_IMAGE;

  return (
    <FeatureShell
      title={property.title}
      subtitle={property.district ?? property.city}
      badge="Property Details"
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.heroCard}>
            <View style={styles.heroImageWrap}>
              <Image
                source={{ uri: primaryImage }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.priceTag}>
                <Text style={styles.priceTagText}>{monthlyRent}</Text>
              </View>
            </View>

            <Text style={styles.title}>{property.title}</Text>
            <Text style={styles.location}>
              {(property.addressLine1 ?? property.city) || 'Premium district'}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>BED</Text>
                <Text style={styles.statValue}>{property.bedrooms ?? 2} Bed</Text>
                <Text style={styles.statLabel}>Bedrooms</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>BATH</Text>
                <Text style={styles.statValue}>2 Bath</Text>
                <Text style={styles.statLabel}>Bathrooms</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>SQM</Text>
                <Text style={styles.statValue}>{property.areaSqm ?? 130} sqm</Text>
                <Text style={styles.statLabel}>Area</Text>
              </View>
            </View>
          </View>

          <View style={styles.bodyCard}>
            <Text style={styles.sectionTitle}>About this residence</Text>
            <Text style={styles.bodyText}>
              {property.description ||
                t(
                  'property.valueText',
                  'Premium tower apartment with concierge service, wellness amenities, and smooth tenant operations from viewing to payment.',
                )}
            </Text>

            <View style={styles.actionRow}>
              <OmniButton
                label={adding ? 'Adding to shortlist...' : 'Reserve Unit'}
                onPress={async () => {
                  if (adding) {
                    return;
                  }

                  setAdding(true);
                  try {
                    await addToShortlist(property.id);
                    requireAuth({
                      isAuthenticated,
                      navigation,
                      action: () => navigation.push('ViewingTrip'),
                    });
                  } finally {
                    setAdding(false);
                  }
                }}
                disabled={adding}
              />

              <OmniButton
                label="Continue to Payment"
                onPress={() =>
                  requireAuth({
                    isAuthenticated,
                    navigation,
                    action: () => navigation.push('Payments'),
                  })
                }
              />

              <OmniButton
                label="Explore Free Services"
                onPress={() => navigation.push('MoveIn')}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </FeatureShell>
  );
}
