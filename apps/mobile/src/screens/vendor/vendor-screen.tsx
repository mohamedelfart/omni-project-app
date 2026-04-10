import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTicketStore } from '../../store/ticket.store';

export function VendorScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const tickets = useTicketStore((state) => state.tickets);
  const acceptTicket = useTicketStore((state) => state.acceptTicket);
  const updateTicketStatus = useTicketStore((state) => state.updateTicketStatus);

  const isArabic = i18n.language === 'ar';
  const openTickets = tickets.filter((ticket) => ticket.status === 'pending' || ticket.status === 'accepted');

  const onAcceptAndNavigate = async (ticketId: string, coordinate: { latitude: number; longitude: number }) => {
    acceptTicket(ticketId, 'Omni Vendor Team');

    const encodedLabel = encodeURIComponent('Tenant Property');
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`;
    const nativeUrl =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${coordinate.latitude},${coordinate.longitude}&q=${encodedLabel}`
        : `geo:${coordinate.latitude},${coordinate.longitude}?q=${coordinate.latitude},${coordinate.longitude}(${encodedLabel})`;

    try {
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpenNative ? nativeUrl : googleMapsUrl);
    } catch {
      await Linking.openURL(googleMapsUrl);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, isArabic && styles.rowRtl]}>
        <Text style={styles.title}>{t('vendor.title')}</Text>
        <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.push('AdminTickets')} activeOpacity={0.85}>
          <Text style={styles.adminBtnText}>{t('vendor.adminView')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {openTickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <Text style={styles.ticketTitle}>{ticket.id} • {ticket.propertyTitle}</Text>
            <Text style={styles.ticketMeta}>{ticket.propertyAddress}</Text>
            <Text style={styles.ticketMeta}>{t('vendor.tenant')}: {ticket.tenantName} ({ticket.tenantPhone})</Text>
            <Text style={styles.ticketMeta}>{t('vendor.service')}: {ticket.serviceType}</Text>
            <Text style={styles.ticketMeta}>{t('vendor.status')}: {t(`tickets.status.${ticket.status}`)}</Text>

            <View style={[styles.actionRow, isArabic && styles.rowRtl]}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => onAcceptAndNavigate(ticket.id, ticket.coordinate)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t('vendor.acceptAndNavigate')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => updateTicketStatus(ticket.id, 'in_progress')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>{t('vendor.markInProgress')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => updateTicketStatus(ticket.id, 'completed')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>{t('vendor.markCompleted')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {openTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('vendor.empty')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8FD' },
  rowRtl: { flexDirection: 'row-reverse' },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4ECF7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#183452', fontSize: 18, fontWeight: '700' },
  adminBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0E0F4',
    backgroundColor: '#F6FAFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminBtnText: { color: '#295D9B', fontSize: 12, fontWeight: '700' },
  content: { padding: 14, gap: 10 },
  ticketCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE8F6',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 4,
  },
  ticketTitle: { color: '#1E395A', fontSize: 14, fontWeight: '700' },
  ticketMeta: { color: '#627A95', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: '#2F80ED',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0DDED',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  secondaryBtnText: { color: '#3A5C83', fontSize: 11, fontWeight: '700' },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE8F6',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  emptyText: { color: '#68809B', fontSize: 13 },
});
