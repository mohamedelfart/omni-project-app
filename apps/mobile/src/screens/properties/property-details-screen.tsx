import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker } from '../../components/maps/map-view';

import { LoginModal } from '../../components/auth/login-modal';
import { OmniSkeleton } from '../../components/omni-skeleton';
import { LOCAL_PROPERTIES, LocalProperty } from '../../data/local-properties';
import { useBookingStore } from '../../store/booking.store';
import { useSessionStore } from '../../store/session.store';

const AREA_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'The Pearl': { latitude: 25.3706, longitude: 51.5508 },
  Lusail: { latitude: 25.421, longitude: 51.514 },
  Msheireb: { latitude: 25.2853, longitude: 51.5274 },
  Austin: { latitude: 30.2672, longitude: -97.7431 },
  Houston: { latitude: 29.7604, longitude: -95.3698 },
};

const AVAILABLE_TIME_SLOTS = ['10:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'];

function normalizeProperty(input?: Partial<LocalProperty> & { id?: string }): LocalProperty {
  if (input?.id) {
    const found = LOCAL_PROPERTIES.find((property) => property.id === input.id);
    if (found) return found;
  }

  return {
    ...LOCAL_PROPERTIES[0],
    ...input,
    id: input?.id ?? LOCAL_PROPERTIES[0].id,
    images: input?.images?.length ? input.images : LOCAL_PROPERTIES[0].images,
  };
}

function localizeType(type: LocalProperty['type'], t: any) {
  const map: Record<LocalProperty['type'], string> = {
    Apartment: t('search.filterValues.apartment'),
    Studio: t('search.filterValues.studio'),
    Villa: t('search.filterValues.villa'),
  };

  return map[type];
}

function formatMoney(minor: number, market: LocalProperty['market']) {
  const currency = market === 'Qatar' ? 'QAR' : 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
}

export function PropertyDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const createBooking = useBookingStore((state) => state.createBooking);

  const { width } = useWindowDimensions();
  const galleryRef = useRef<FlatList<string>>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQuickBookingModal, setShowQuickBookingModal] = useState(false);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string | null>(null);
  const [selectedBookingTime, setSelectedBookingTime] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [isScreenLoading, setIsScreenLoading] = useState(true);

  const pageFadeAnim = useRef(new Animated.Value(0)).current;

  const property = useMemo(() => normalizeProperty(route.params?.property), [route.params?.property]);
  const isArabic = i18n.language === 'ar';

  const coordinates = AREA_COORDINATES[property.area] ?? { latitude: 25.2854, longitude: 51.531 };

  const bookingDates = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(isArabic ? 'ar-QA' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      const value = date.toISOString().split('T')[0];

      return {
        value,
        label: formatter.format(date),
      };
    });
  }, [isArabic]);

  useEffect(() => {
    Animated.timing(pageFadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [pageFadeAnim]);

  useEffect(() => {
    const timer = setTimeout(() => setIsScreenLoading(false), 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (property.images.length < 2 || isScreenLoading) return;

    const autoSlideTimer = setInterval(() => {
      setActiveImageIndex((prevIndex: number) => {
        const nextIndex = (prevIndex + 1) % property.images.length;
        galleryRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(autoSlideTimer);
  }, [isScreenLoading, property.images.length]);

  const smartDescription = t('details.smartDescription', {
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    type: localizeType(property.type, t),
    location: property.location,
  });

  const specs = [
    {
      icon: 'BR',
      value: `${property.bedrooms}`,
      label: t('details.specs.bedrooms'),
    },
    {
      icon: 'BA',
      value: `${property.bathrooms}`,
      label: t('details.specs.bathrooms'),
    },
    {
      icon: 'SQM',
      value: `${property.sizeSqm}`,
      label: t('details.specs.area'),
    },
    {
      icon: 'FUR',
      value: property.furnished === 'Yes' ? t('filters.yes') : t('filters.no'),
      label: t('details.specs.furnished'),
    },
  ];

  const amenityIcons: Record<LocalProperty['amenities'][number], string> = {
    Gym: '🏋️',
    Pool: '🏊',
    Parking: '🚗',
    Security: '🛡️',
  };

  const onBookViewing = () => {
    setBookingMessage('');
    setShowQuickBookingModal(true);
  };

  const onConfirmBookingRequest = () => {
    if (!selectedBookingDate) {
      setBookingMessage(t('details.booking.pickDateFirst'));
      return;
    }

    if (!selectedBookingTime) {
      setBookingMessage(t('details.booking.pickTimeFirst'));
      return;
    }

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    createBooking({
      property,
      date: selectedBookingDate,
      time: selectedBookingTime,
    });

    setBookingMessage(
      t('details.booking.success', {
        date: selectedBookingDate,
        time: selectedBookingTime,
      }),
    );
  };

  const onContactAgent = async () => {
    const prefilledText = t('details.whatsAppMessage', {
      propertyId: property.id,
      propertyName: property.title,
    });
    const encodedMessage = encodeURIComponent(prefilledText);

    const whatsappAppUrl = `whatsapp://send?phone=97450001122&text=${encodedMessage}`;
    const whatsappWebUrl = `https://wa.me/97450001122?text=${encodedMessage}`;
    const phoneUrl = 'tel:+97450001122';

    try {
      const canOpenWhatsAppApp = await Linking.canOpenURL(whatsappAppUrl);
      if (canOpenWhatsAppApp) {
        await Linking.openURL(whatsappAppUrl);
        return;
      }

      const canOpenWhatsAppWeb = await Linking.canOpenURL(whatsappWebUrl);
      if (canOpenWhatsAppWeb) {
        await Linking.openURL(whatsappWebUrl);
        return;
      }

      await Linking.openURL(phoneUrl);
    } catch {
      await Linking.openURL(phoneUrl);
    }
  };

  const onCallAgent = async () => {
    const phoneUrl = 'tel:+97450001122';
    try {
      await Linking.openURL(phoneUrl);
    } catch {
      setBookingMessage(t('details.contactError'));
    }
  };

  const onShareProperty = async () => {
    try {
      await Share.share({
        title: property.title,
        message: t('details.shareMessage', {
          propertyId: property.id,
          propertyName: property.title,
          location: property.location,
          price: property.price,
        }),
      });
    } catch {
      setBookingMessage(t('details.shareError'));
    }
  };

  const onOpenInMaps = async () => {
    const encodedLabel = encodeURIComponent(property.location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;

    const nativeUrl =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${coordinates.latitude},${coordinates.longitude}&q=${encodedLabel}`
        : `geo:${coordinates.latitude},${coordinates.longitude}?q=${coordinates.latitude},${coordinates.longitude}(${encodedLabel})`;

    try {
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpenNative ? nativeUrl : googleMapsUrl);
    } catch {
      await Linking.openURL(googleMapsUrl);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.topBar, isArabic && styles.rowRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>{isArabic ? '→' : '←'}</Text>
        </TouchableOpacity>
        <View style={[styles.titleWrap, isArabic && styles.rowRtl]}>
          <Text style={[styles.navTitle, isArabic && styles.textRtl]}>{t('details.title')}</Text>
          <Text style={[styles.navSubTitle, isArabic && styles.textRtl]}>{property.area}</Text>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: pageFadeAnim }}>
        {isScreenLoading ? (
          <View style={styles.loadingWrap}>
            <OmniSkeleton height={260} radius={18} />
            <OmniSkeleton height={20} width="58%" style={{ marginTop: 14 }} />
            <OmniSkeleton height={14} width="42%" style={{ marginTop: 8 }} />
            <OmniSkeleton height={130} radius={14} style={{ marginTop: 16 }} />
          </View>
        ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.galleryWrap}>
          <FlatList
            ref={galleryRef}
            horizontal
            pagingEnabled
            data={property.images}
            keyExtractor={(img: string, idx: number) => `${property.id}-${idx}-${img}`}
            onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const idx = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(idx);
            }}
            renderItem={({ item }: { item: string }) => (
              <Image
                source={{ uri: item }}
                style={[styles.galleryImage, { width }]}
                resizeMode="cover"
              />
            )}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_d: unknown, idx: number) => ({ length: width, offset: width * idx, index: idx })}
          />

          <View style={styles.heroSoftOverlayTop} />
          <View style={styles.heroSoftOverlayBottom} />

          <View style={[styles.galleryOverlay, isArabic && styles.rowRtl]}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{localizeType(property.type, t)}</Text>
            </View>
            <View style={[styles.imageCounter, isArabic && styles.rowRtl]}>
              <Text style={styles.imageCounterText}>{activeImageIndex + 1}</Text>
              <Text style={styles.imageCounterText}>/</Text>
              <Text style={styles.imageCounterText}>{property.images.length}</Text>
            </View>
          </View>

          <View style={[styles.dotsWrap, isArabic && styles.rowRtl]}>
            {property.images.map((img: string, index: number) => (
              <View key={`${img}-${index}`} style={[styles.dot, index === activeImageIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.infoBlock}>
            <Text style={[styles.propertyTitle, isArabic && styles.textRtl]}>{property.title}</Text>
            <Text style={[styles.locationText, isArabic && styles.textRtl]}>{property.location}</Text>
            <Text style={[styles.priceText, isArabic && styles.textRtl]}>{property.price}</Text>
            <View style={styles.quickValueWrap}>
              <Text style={[styles.quickValueHint, isArabic && styles.textRtl]}>✔ Free moving included</Text>
              <Text style={[styles.quickValueHint, isArabic && styles.textRtl]}>✔ Free cleaning included</Text>
            </View>
          </View>

          <View style={styles.freeServicesCard}>
            <Text style={[styles.freeServicesTitle, isArabic && styles.textRtl]}>✨ Included for Free</Text>
            <Text style={[styles.freeServiceItem, isArabic && styles.textRtl]}>• Moving service (up to 500 QAR)</Text>
            <Text style={[styles.freeServiceItem, isArabic && styles.textRtl]}>• Monthly cleaning (1 visit)</Text>
            <Text style={[styles.freeServiceItem, isArabic && styles.textRtl]}>• Maintenance support</Text>
          </View>

          <View style={styles.specSection}>
            <Text style={[styles.sectionTitle, isArabic && styles.textRtl]}>{t('details.keySpecs')}</Text>
            <View style={[styles.specsGrid, isArabic && styles.rowRtl]}>
              {specs.map((spec) => (
                <View key={spec.icon} style={styles.specCard}>
                  <View style={styles.specIconBubble}>
                    <Text style={styles.specIconText}>{spec.icon}</Text>
                  </View>
                  <Text style={styles.specValue}>{spec.value}</Text>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, isArabic && styles.textRtl]}>{t('details.smartDescriptionTitle')}</Text>
            <Text style={[styles.descriptionText, isArabic && styles.textRtl]} numberOfLines={3}>{smartDescription}</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, isArabic && styles.textRtl]}>{t('details.amenitiesTitle')}</Text>
            <View style={[styles.amenitiesGrid, isArabic && styles.rowRtl]}>
              {property.amenities.map((amenity) => (
                <View key={amenity} style={styles.amenityGridItem}>
                  <Text style={styles.amenityIcon}>{amenityIcons[amenity]}</Text>
                  <Text style={styles.amenityChipText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, isArabic && styles.textRtl]}>{t('details.locationContext')}</Text>
            <View style={styles.mapCard}>
              {Platform.OS === 'web' ? (
                <View style={styles.mapFallback}>
                  <Text style={[styles.mapFallbackText, isArabic && styles.textRtl]}>{t('details.mapFallback')}</Text>
                </View>
              ) : (
                <MapView
                  style={styles.miniMap}
                  initialRegion={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                    }}
                  />
                </MapView>
              )}

              <TouchableOpacity style={styles.openMapsBtn} onPress={onOpenInMaps} activeOpacity={0.85}>
                <Text style={styles.openMapsBtnText}>{t('details.openInMaps')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
        )}
      </Animated.View>

      <View style={[styles.stickyActionBar, isArabic && styles.rowRtl]}>
        <TouchableOpacity style={styles.secondaryActionBtn} onPress={onBookViewing} activeOpacity={0.85}>
          <Text style={styles.secondaryActionText}>Request Viewing</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryActionBtn} onPress={onBookViewing} activeOpacity={0.85}>
          <View style={styles.primaryGradientTop} />
          <View style={styles.primaryGradientBottom} />
          <Text style={styles.primaryActionText}>Reserve Unit</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.myBookingsFab} onPress={() => navigation.push('MyBookings')} activeOpacity={0.85}>
        <Text style={styles.myBookingsFabText}>{t('bookings.title')}</Text>
      </TouchableOpacity>

      <LoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} isArabic={isArabic} />

      <Modal
        visible={showQuickBookingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickBookingModal(false)}
      >
        <View style={styles.bookingModalOverlay}>
          <View style={styles.bookingModalCard}>
            <Text style={[styles.bookingModalTitle, isArabic && styles.textRtl]}>{t('details.booking.title')}</Text>
            <Text style={[styles.bookingModalSubTitle, isArabic && styles.textRtl]}>{t('details.booking.pickDate')}</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.bookingDateRow, isArabic && styles.rowRtl]}
            >
              {bookingDates.map((dateOption) => {
                const selected = selectedBookingDate === dateOption.value;

                return (
                  <TouchableOpacity
                    key={dateOption.value}
                    style={[styles.bookingDateChip, selected && styles.bookingDateChipActive]}
                    onPress={() => setSelectedBookingDate(dateOption.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.bookingDateChipText, selected && styles.bookingDateChipTextActive]}>
                      {dateOption.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.bookingModalSubTitle, isArabic && styles.textRtl]}>{t('details.booking.pickTime')}</Text>
            <View style={[styles.bookingTimeGrid, isArabic && styles.rowRtl]}>
              {AVAILABLE_TIME_SLOTS.map((slot) => {
                const selected = selectedBookingTime === slot;

                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.bookingTimeChip, selected && styles.bookingTimeChipActive]}
                    onPress={() => setSelectedBookingTime(slot)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.bookingTimeChipText, selected && styles.bookingTimeChipTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {bookingMessage ? (
              <Text style={[styles.bookingMessage, isArabic && styles.textRtl]}>{bookingMessage}</Text>
            ) : null}

            <View style={[styles.bookingActions, isArabic && styles.rowRtl]}>
              <TouchableOpacity
                style={styles.bookingGhostBtn}
                onPress={() => {
                  setShowQuickBookingModal(false);
                  setBookingMessage('');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.bookingGhostBtnText}>{t('search.close')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.bookingConfirmBtn} onPress={onConfirmBookingRequest} activeOpacity={0.85}>
                <Text style={styles.bookingConfirmBtnText}>{t('details.booking.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF3FA' },
  rowRtl: { flexDirection: 'row-reverse' },
  textRtl: { textAlign: 'right' },

  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3EAF4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F8FF',
    borderWidth: 1,
    borderColor: '#D9E4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#2B4C74', fontSize: 16, fontWeight: '700' },
  titleWrap: { flex: 1, flexDirection: 'column' },
  navTitle: { color: '#12253B', fontSize: 16, fontWeight: '700' },
  navSubTitle: { color: '#6B7F99', fontSize: 12, marginTop: 2 },

  content: { paddingBottom: 128 },
  loadingWrap: { paddingHorizontal: 14, paddingTop: 12 },

  galleryWrap: {
    backgroundColor: '#0A1525',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  galleryImage: { height: 302 },
  heroSoftOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: 'rgba(6, 18, 36, 0.2)',
  },
  heroSoftOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 86,
    backgroundColor: 'rgba(6, 18, 36, 0.24)',
  },
  galleryOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(9, 29, 53, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(189, 209, 235, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  typeBadgeText: { color: '#EAF2FF', fontSize: 11, fontWeight: '700' },
  imageCounter: {
    borderRadius: 999,
    backgroundColor: 'rgba(9, 29, 53, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(189, 209, 235, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 4,
  },
  imageCounterText: { color: '#EAF2FF', fontSize: 11, fontWeight: '700' },

  dotsWrap: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  dotActive: {
    width: 16,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },

  mainCard: {
    marginHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DEE8F5',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 16,
    shadowColor: '#0D223B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  infoBlock: { gap: 18 },
  propertyTitle: { color: '#132740', fontSize: 22, fontWeight: '700' },
  locationText: { color: '#73859D', fontSize: 13 },
  priceText: { color: '#2B6CB7', fontSize: 21, fontWeight: '700' },
  quickValueWrap: { gap: 4, marginTop: -4 },
  quickValueHint: { color: '#4F6E93', fontSize: 12, fontWeight: '600' },
  freeServicesCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#0D223B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  freeServicesTitle: { color: '#1B3960', fontSize: 15, fontWeight: '700' },
  freeServiceItem: { color: '#4E6A8C', fontSize: 13, lineHeight: 20, fontWeight: '500' },

  sectionBlock: { gap: 9 },
  sectionTitle: { color: '#1B3351', fontSize: 15, fontWeight: '700' },

  specSection: { gap: 10 },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specCard: {
    width: '48.7%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE6F4',
    backgroundColor: '#F7FAFF',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  specIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E7F0FF',
    borderWidth: 1,
    borderColor: '#C8DDFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specIconText: { color: '#315D96', fontSize: 10, fontWeight: '800' },
  specValue: { color: '#19385C', fontSize: 14, fontWeight: '700' },
  specLabel: { color: '#72869E', fontSize: 11, fontWeight: '600' },

  descriptionText: { color: '#47617F', fontSize: 14, lineHeight: 22 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityGridItem: {
    width: '31.8%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E2F4',
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
  },
  amenityIcon: { fontSize: 16 },
  amenityChipText: { color: '#416387', fontSize: 12, fontWeight: '700' },

  mapCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE7F4',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  miniMap: {
    height: 176,
    width: '100%',
  },
  mapFallback: {
    height: 176,
    backgroundColor: '#F4F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  mapFallbackText: { color: '#5F7592', fontSize: 13 },
  openMapsBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2EBF6',
    backgroundColor: '#F8FBFF',
  },
  openMapsBtnText: { color: '#2C5D9F', fontSize: 13, fontWeight: '700' },

  stickyActionBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E3F2',
    backgroundColor: '#FFFFFF',
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#0B1B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: '#BFD4EF',
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: { color: '#2B5E9B', fontSize: 13, fontWeight: '700' },
  primaryActionBtn: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2A72D9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: '#4A92F4',
    opacity: 0.95,
  },
  primaryGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '56%',
    backgroundColor: '#1E64C9',
    opacity: 0.98,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  myBookingsFab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    borderRadius: 999,
    backgroundColor: '#102D4E',
    borderWidth: 1,
    borderColor: '#244B77',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBookingsFabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  bookingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 21, 38, 0.34)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  bookingModalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E6F5',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
    shadowColor: '#0B1B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  bookingModalTitle: { color: '#18324E', fontSize: 16, fontWeight: '700' },
  bookingModalSubTitle: { color: '#4F6785', fontSize: 13, fontWeight: '600', marginTop: 2 },
  bookingDateRow: { gap: 8, paddingVertical: 2 },
  bookingDateChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E3F2',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bookingDateChipActive: { backgroundColor: '#2F80ED', borderColor: '#2F80ED' },
  bookingDateChipText: { color: '#3F5E82', fontSize: 12, fontWeight: '700' },
  bookingDateChipTextActive: { color: '#FFFFFF' },
  bookingTimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bookingTimeChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E3F2',
    backgroundColor: '#FFFFFF',
    minWidth: '48%',
    paddingVertical: 9,
    alignItems: 'center',
  },
  bookingTimeChipActive: { backgroundColor: '#EAF3FF', borderColor: '#95BDF8' },
  bookingTimeChipText: { color: '#3F5E82', fontSize: 12, fontWeight: '700' },
  bookingTimeChipTextActive: { color: '#174B92' },
  bookingMessage: { color: '#2B5E9B', fontSize: 12, fontWeight: '600' },
  bookingActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  bookingGhostBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D2DEEE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingGhostBtnText: { color: '#5F7693', fontSize: 13, fontWeight: '700' },
  bookingConfirmBtn: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingConfirmBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
