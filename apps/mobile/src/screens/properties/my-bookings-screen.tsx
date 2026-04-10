import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OmniSkeleton } from '../../components/omni-skeleton';
import { useBookingStore } from '../../store/booking.store';

export function MyBookingsScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const bookings = useBookingStore((state) => state.bookings);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, isArabic && styles.rowRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>{isArabic ? '→' : '←'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, isArabic && styles.textRtl]}>{t('bookings.title')}</Text>
          <Text style={[styles.subTitle, isArabic && styles.textRtl]}>{t('bookings.subtitle')}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyWrap}>
          <OmniSkeleton height={20} width="46%" />
          <OmniSkeleton height={14} width="70%" style={{ marginTop: 8 }} />
          <OmniSkeleton height={82} radius={12} style={{ marginTop: 12 }} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, isArabic && styles.textRtl]}>{t('bookings.empty')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <Image source={{ uri: booking.propertyImage }} style={styles.cardImage} resizeMode="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.cardTitle, isArabic && styles.textRtl]} numberOfLines={1}>
                  {booking.propertyTitle}
                </Text>
                <Text style={[styles.cardMeta, isArabic && styles.textRtl]} numberOfLines={1}>
                  {booking.propertyLocation}
                </Text>
                <Text style={[styles.cardMeta, isArabic && styles.textRtl]}>
                  {t('bookings.dateTime', { date: booking.date, time: booking.time })}
                </Text>
                <View style={styles.statusChip}>
                  <Text style={styles.statusText}>{t(`bookings.status.${booking.status}`)}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FD' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBF5',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  textRtl: { textAlign: 'right' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F6FF',
    borderWidth: 1,
    borderColor: '#D8E5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#2B4F7D', fontSize: 16, fontWeight: '700' },
  title: { color: '#152C49', fontSize: 17, fontWeight: '700' },
  subTitle: { color: '#6E839C', fontSize: 12 },
  content: { padding: 14, gap: 10 },
  emptyWrap: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE8F4',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  emptyText: { marginTop: 12, color: '#6B819D', fontSize: 13 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE8F4',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 10,
    flexDirection: 'row',
  },
  cardImage: { width: 84, height: 84, borderRadius: 10 },
  cardTitle: { color: '#172E4C', fontSize: 14, fontWeight: '700' },
  cardMeta: { color: '#6C819B', fontSize: 12 },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#CAE0FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: { color: '#255B9C', fontSize: 11, fontWeight: '700' },
});
