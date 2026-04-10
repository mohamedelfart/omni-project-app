import { memo, useRef } from 'react';
import {
  Animated,
  I18nManager,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LocalProperty } from '../../../data/local-properties';

type PropertyCardProps = {
  property: LocalProperty;
  recommendationLabel?: string;
  specLabels: {
    bed: string;
    bath: string;
    sizeUnit: string;
  };
  saved: boolean;
  onToggleFavorite: () => void;
  onViewDetails: () => void;
  viewDetailsLabel: string;
  isRtl?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
};

function PropertyCardBase({
  property,
  recommendationLabel,
  specLabels,
  saved,
  onToggleFavorite,
  onViewDetails,
  viewDetailsLabel,
  isRtl = I18nManager.isRTL,
  isLoading = false,
  disabled = false,
}: PropertyCardProps) {
  const favoriteScale = useRef(new Animated.Value(1)).current;

  const animateFavorite = () => {
    if (disabled || isLoading) return;

    Animated.sequence([
      Animated.timing(favoriteScale, { toValue: 1.1, duration: 120, useNativeDriver: true }),
      Animated.timing(favoriteScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    onToggleFavorite();
  };

  return (
    <Pressable
      onPress={onViewDetails}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.card,
        isLoading && styles.cardLoading,
        disabled && styles.cardDisabled,
        pressed && !disabled && !isLoading ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: property.images[0] }} style={styles.cardImage} resizeMode="cover" />

        <View style={[styles.typeBadge, isRtl ? styles.badgeRight : styles.badgeLeft]}>
          <Text style={styles.typeBadgeText}>{property.type}</Text>
        </View>

        <Animated.View
          style={[
            styles.favoriteWrap,
            isRtl ? styles.favoriteLeft : styles.favoriteRight,
            { transform: [{ scale: favoriteScale }] },
          ]}
        >
          <TouchableOpacity onPress={animateFavorite} activeOpacity={0.8} disabled={disabled || isLoading}>
            <Text style={[styles.favoriteIcon, saved && styles.favoriteIconActive]}>{saved ? '♥' : '♡'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.titleRow, isRtl && styles.titleRowRtl]}>
          <Text style={[styles.cardTitle, isRtl && styles.textRtl]} numberOfLines={1}>
            {property.title}
          </Text>
          {recommendationLabel ? <Text style={styles.recoLabel}>{recommendationLabel}</Text> : null}
        </View>

        <Text style={[styles.cardLocation, isRtl && styles.textRtl]} numberOfLines={1}>
          {property.location}
        </Text>
        <Text style={[styles.cardPrice, isRtl && styles.textRtl]}>{property.price}</Text>

        <View style={[styles.specsRow, isRtl && styles.specsRowRtl]}>
          <Text style={styles.specItem}>{property.bedrooms} {specLabels.bed}</Text>
          <Text style={styles.specItem}>{property.bathrooms} {specLabels.bath}</Text>
          <Text style={styles.specItem}>{property.sizeSqm} {specLabels.sizeUnit}</Text>
        </View>

        <TouchableOpacity
          onPress={onViewDetails}
          activeOpacity={0.85}
          style={styles.viewDetailsBtn}
          disabled={disabled || isLoading}
        >
          <Text style={styles.viewDetailsText}>{viewDetailsLabel}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

export const PropertyCard = memo(PropertyCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: { transform: [{ scale: 0.99 }] },
  cardDisabled: { opacity: 0.6 },
  cardLoading: { opacity: 0.8 },
  imageWrap: { height: 210, position: 'relative' },
  cardImage: { width: '100%', height: 210 },
  typeBadge: {
    position: 'absolute',
    top: 10,
    backgroundColor: 'rgba(16,33,56,0.72)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLeft: { left: 10 },
  badgeRight: { right: 10 },
  typeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  favoriteWrap: {
    position: 'absolute',
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#DEE7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteRight: { right: 10 },
  favoriteLeft: { left: 10 },
  favoriteIcon: { color: '#B8C2CC', fontSize: 14, fontWeight: '700' },
  favoriteIconActive: { color: '#5B8DEF' },
  cardBody: { padding: 12, gap: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titleRowRtl: { flexDirection: 'row-reverse' },
  cardTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700', flex: 1 },
  cardLocation: { color: '#6B7280', fontSize: 13 },
  cardPrice: { color: '#2F80ED', fontSize: 16, fontWeight: '700' },
  textRtl: { textAlign: 'right' },
  recoLabel: {
    color: '#4A6A96',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#EEF4FD',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  specsRow: { flexDirection: 'row', gap: 10 },
  specsRowRtl: { flexDirection: 'row-reverse' },
  specItem: { color: '#4B607B', fontSize: 12, fontWeight: '600' },
  viewDetailsBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    opacity: 0.95,
  },
  viewDetailsText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
