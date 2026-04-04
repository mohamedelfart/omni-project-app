import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '../../components/action-card';
import { PremiumSearchBar } from '../../components/premium-search-bar';
import { mobileTheme } from '../../theme';

const widgets = [
  { label: 'Next viewing trip', value: '3 shortlisted homes ready for routed pickup' },
  { label: 'Free service balance', value: 'Moving covered up to QAR 500' },
  { label: 'Insurance', value: 'Protection active and ready for renewal' },
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
        <ActionCard icon="🏢" title="Property Search" subtitle="Search, shortlist up to 3 homes, and request a routed viewing" onPress={() => navigation.navigate('PropertySearch')} />
        <ActionCard icon="📦" title="Free Services" subtitle="Moving, maintenance, cleaning, and airport support" onPress={() => navigation.navigate('MoveIn')} />
        <ActionCard icon="🧰" title="Services" subtitle="Operator-managed services across your full tenant journey" onPress={() => navigation.navigate('ServicesHub')} />
        <ActionCard icon="💳" title="Payments" subtitle="Rent, service excess, and scheduled charges" onPress={() => navigation.navigate('Payments')} />
        <ActionCard icon="🛡️" title="Insurance" subtitle="Coverage and benefits in one dedicated place" featured onPress={() => navigation.navigate('Insurance')} />
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
