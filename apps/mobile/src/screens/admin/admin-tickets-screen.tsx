import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getTicketDurationMinutes, useTicketStore } from '../../store/ticket.store';

export function AdminTicketsScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const tickets = useTicketStore((state) => state.tickets);

  const isArabic = i18n.language === 'ar';

  const metrics = useMemo(() => {
    const completed = tickets.filter((ticket) => ticket.status === 'completed');
    const avgMinutes = completed.length
      ? Math.round(
          completed
            .map((ticket) => getTicketDurationMinutes(ticket) ?? 0)
            .reduce((total, current) => total + current, 0) / completed.length,
        )
      : 0;

    return {
      total: tickets.length,
      pending: tickets.filter((ticket) => ticket.status === 'pending').length,
      accepted: tickets.filter((ticket) => ticket.status === 'accepted').length,
      completed: completed.length,
      avgMinutes,
    };
  }, [tickets]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, isArabic && styles.rowRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>{isArabic ? '→' : '←'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, isArabic && styles.textRtl]}>{t('adminTickets.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metricsCard}>
          <Text style={styles.metricLine}>{t('adminTickets.total')}: {metrics.total}</Text>
          <Text style={styles.metricLine}>{t('adminTickets.pending')}: {metrics.pending}</Text>
          <Text style={styles.metricLine}>{t('adminTickets.accepted')}: {metrics.accepted}</Text>
          <Text style={styles.metricLine}>{t('adminTickets.completed')}: {metrics.completed}</Text>
          <Text style={styles.metricLine}>{t('adminTickets.avgDuration')}: {metrics.avgMinutes} {t('adminTickets.minutes')}</Text>
        </View>

        {tickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <Text style={styles.ticketTitle}>{ticket.id} • {ticket.propertyTitle}</Text>
            <Text style={styles.ticketMeta}>{ticket.propertyAddress}</Text>
            <Text style={styles.ticketMeta}>{t('adminTickets.vendor')}: {ticket.vendorName ?? t('adminTickets.unassigned')}</Text>
            <Text style={styles.ticketMeta}>{t('adminTickets.status')}: {t(`tickets.status.${ticket.status}`)}</Text>
            <Text style={styles.ticketMeta}>
              {t('adminTickets.duration')}: {getTicketDurationMinutes(ticket) ?? 0} {t('adminTickets.minutes')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8FE' },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: '#F2F6FF',
    borderWidth: 1,
    borderColor: '#D7E3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#274B79', fontSize: 16, fontWeight: '700' },
  title: { color: '#17314D', fontSize: 16, fontWeight: '700' },
  content: { padding: 14, gap: 10 },
  metricsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE7F6',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 4,
  },
  metricLine: { color: '#2D527C', fontSize: 13, fontWeight: '600' },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBE7F6',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 3,
  },
  ticketTitle: { color: '#1C3756', fontSize: 13, fontWeight: '700' },
  ticketMeta: { color: '#5C748F', fontSize: 12 },
});
