import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getTranslator } from '../lib/language';
import { useSessionStore } from '../store/session.store';
import { mobileTheme } from '../theme';

type PropertyMapCardProps = {
  lat: number;
  lng: number;
  addressLine1?: string | null;
  city?: string | null;
  district?: string | null;
  title?: string | null;
};

function formatAddress(props: PropertyMapCardProps): string {
  const parts = [props.addressLine1, props.district, props.city].filter(Boolean);
  return parts.join(', ') || `${props.lat.toFixed(5)}, ${props.lng.toFixed(5)}`;
}

function getOpenInMapsUrl(lat: number, lng: number, label?: string | null): string {
  const q = label ? `${encodeURIComponent(label)}@${lat},${lng}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * PropertyMapCard — lightweight static map preview + "Open in Maps" deep link.
 * Uses Google Maps static image URL (no SDK required).
 * Falls back to coordinate display when API key is unavailable.
 */
export function PropertyMapCard({ lat, lng, addressLine1, city, district, title }: PropertyMapCardProps) {
  const locale = useSessionStore((state) => state.locale);
  const t = getTranslator(locale);
  const address = formatAddress({ lat, lng, addressLine1, city, district, title });
  const mapsUrl = getOpenInMapsUrl(lat, lng, title ?? addressLine1);

  const handleOpenMaps = () => {
    Linking.openURL(mapsUrl).catch(() => {
      // Graceful failure: keep map card visible even if device cannot open deep link.
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{t('map.location', 'Location')}</Text>
      <View style={styles.coordRow}>
        <Text style={styles.coordIcon}>📍</Text>
        <Text style={styles.address}>{address}</Text>
      </View>
      <View style={styles.coordMeta}>
        <Text style={styles.coordText}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
      </View>
      <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps} activeOpacity={0.8}>
        <Text style={styles.mapsButtonText}>{t('map.openInMaps', 'Open in Maps')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.colors.white,
    borderWidth: 1,
    borderColor: mobileTheme.colors.neutral100,
    borderRadius: mobileTheme.radii.lg,
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: mobileTheme.colors.neutral600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: mobileTheme.spacing.sm,
  },
  coordIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: mobileTheme.colors.primary,
    fontWeight: '600',
    lineHeight: 20,
  },
  coordMeta: {
    paddingLeft: 24,
  },
  coordText: {
    fontSize: 12,
    color: mobileTheme.colors.neutral600,
    fontFamily: 'monospace',
  },
  mapsButton: {
    marginTop: mobileTheme.spacing.xs,
    backgroundColor: mobileTheme.colors.primary,
    borderRadius: mobileTheme.radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mapsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
