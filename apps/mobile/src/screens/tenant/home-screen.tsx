import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '../../components/action-card';
import { PremiumSearchBar } from '../../components/premium-search-bar';
import { mobileTheme } from '../../theme';

const widgets = [
  { label: 'Upcoming Booking', value: 'Doha Marina Tower - 10 Apr' },
  { label: 'Next Payment', value: 'QAR 8,500 due in 6 days' },
  { label: 'Active Service', value: 'Monthly cleaning - Scheduled' },
  { label: 'Rewards Status', value: 'Gold tier - 1,250 points' },
  { label: 'Insurance Coverage', value: 'Rent default protection active' },
];

export function TenantHomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.logo}>QuickRent</Text>
        <View style={styles.headerIcons}>
          <Text style={styles.icon}>🔔</Text>
          <Text style={styles.icon}>👤</Text>
        </View>
      </View>

      <Text style={styles.greeting}>{t('home.greeting')}</Text>
      <PremiumSearchBar placeholder={t('home.searchPlaceholder')} />

      <View style={styles.grid}>
        <ActionCard icon="🏢" title={t('home.actions.propertySearch')} onPress={() => navigation.navigate('PropertySearch')} />
        <ActionCard icon="🧰" title={t('home.actions.services')} onPress={() => navigation.navigate('ServicesHub')} />
        <ActionCard icon="💳" title={t('home.actions.payments')} onPress={() => navigation.navigate('Payments')} />
        <ActionCard icon="🎁" title={t('home.actions.rewards')} onPress={() => navigation.navigate('Rewards')} />
      </View>

      <View style={styles.widgetWrap}>
        {widgets.map((widget) => (
          <View key={widget.label} style={styles.widgetCard}>
            <Text style={styles.widgetLabel}>{widget.label}</Text>
            <Text style={styles.widgetValue}>{widget.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: mobileTheme.colors.primary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: mobileTheme.spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  greeting: {
    fontSize: 18,
    color: mobileTheme.colors.neutral600,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing.md,
  },
  widgetWrap: {
    gap: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.sm,
  },
  widgetCard: {
    backgroundColor: mobileTheme.colors.white,
    borderWidth: 1,
    borderColor: mobileTheme.colors.neutral100,
    borderRadius: mobileTheme.radii.lg,
    padding: mobileTheme.spacing.lg,
  },
  widgetLabel: {
    color: mobileTheme.colors.neutral600,
    fontSize: 13,
  },
  widgetValue: {
    color: mobileTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
});
