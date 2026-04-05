import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ActionCard } from '../../components/action-card';
import { PremiumSearchBar } from '../../components/premium-search-bar';
import { getTranslator } from '../../lib/language';
import { type TenantServiceRecommendation, fetchTenantRecommendations } from '../../lib/tenant-recommendations-api';
import { useSessionStore } from '../../store/session.store';
import { mobileTheme } from '../../theme';

const BADGE_COLORS: Record<string, string> = {
  free: '#16a34a',
  priority: '#d97706',
  suggested: '#2563eb',
  new: '#7c3aed',
};

const BADGE_KEY_BY_TYPE: Record<string, string> = {
  free: 'home.badge.free',
  priority: 'home.badge.priority',
  suggested: 'home.badge.suggested',
  new: 'home.badge.new',
};

function ServiceRecommendationCard({
  item,
  t,
  onPress,
}: {
  item: TenantServiceRecommendation;
  t: (key: string, fallback?: string) => string;
  onPress: () => void;
}) {
  const badgeColor = BADGE_COLORS[item.badge] ?? '#6b7280';
  const badgeLabel = t(BADGE_KEY_BY_TYPE[item.badge] ?? '', item.badge);

  return (
    <TouchableOpacity style={styles.recCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.recHeader}>
        <Text style={styles.recTitle}>{item.displayName}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      </View>
      <Text style={styles.recTagline}>{item.tagline}</Text>
      <Text style={styles.recReason}>{item.reason}</Text>
    </TouchableOpacity>
  );
}

export function TenantHomeScreen() {
  const navigation = useNavigation<any>();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const locale = useSessionStore((s) => s.locale);
  const t = getTranslator(locale);
  const [recommendations, setRecommendations] = useState<TenantServiceRecommendation[]>([]);
  const [freeHighlight, setFreeHighlight] = useState<string | null>(null);

  const staticWidgets = [
    {
      label: t('home.widget.freeBalance.label', 'Free service balance'),
      value: t('home.widget.freeBalance.value', 'Moving covered up to QAR 500'),
    },
    {
      label: t('home.widget.insurance.label', 'Insurance'),
      value: t('home.widget.insurance.value', 'Protection active and ready for renewal'),
    },
  ];

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTenantRecommendations()
      .then((data) => {
        const safeTop = Array.isArray(data?.top)
          ? data.top.filter((item): item is TenantServiceRecommendation => Boolean(item?.serviceType && item?.displayName))
          : [];
        setRecommendations(safeTop);
        setFreeHighlight(data?.freeServiceHighlight ?? null);
      })
      .catch(() => {
        // Graceful silent fallback — recommendations are non-critical
      });
  }, [isAuthenticated]);

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
        <ActionCard
          icon="🏢"
          title={t('home.action.propertySearch.title', 'Property Search')}
          subtitle={t('home.action.propertySearch.subtitle', 'Search, shortlist up to 3 homes, and request a routed viewing')}
          onPress={() => navigation.navigate('PropertySearch')}
        />
        <ActionCard
          icon="📦"
          title={t('home.action.freeServices.title', 'Free Services')}
          subtitle={t('home.action.freeServices.subtitle', 'Moving, maintenance, cleaning, and airport support')}
          onPress={() => navigation.navigate('MoveIn')}
        />
        <ActionCard
          icon="🧰"
          title={t('home.action.services.title', 'Services')}
          subtitle={t('home.action.services.subtitle', 'Operator-managed services across your full tenant journey')}
          onPress={() => navigation.navigate('ServicesHub')}
        />
        <ActionCard
          icon="💳"
          title={t('home.action.payments.title', 'Payments')}
          subtitle={t('home.action.payments.subtitle', 'Rent, service excess, and scheduled charges')}
          onPress={() => navigation.navigate('Payments')}
        />
        <ActionCard
          icon="🛡️"
          title={t('home.action.insurance.title', 'Insurance')}
          subtitle={t('home.action.insurance.subtitle', 'Coverage and benefits in one dedicated place')}
          featured
          onPress={() => navigation.navigate('Insurance')}
        />
      </View>

      {recommendations.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('home.recommended', 'Recommended for you')}</Text>
          {freeHighlight ? (
            <View style={styles.freeHighlightCard}>
              <Text style={styles.freeHighlightText}>✦ {freeHighlight}</Text>
            </View>
          ) : null}
          {recommendations.map((rec) => (
            <ServiceRecommendationCard
              key={rec.serviceType}
              item={rec}
              t={t}
              onPress={() => navigation.navigate(rec.navigateTo || 'ServicesHub')}
            />
          ))}
        </View>
      )}

      <View style={styles.widgetWrap}>
        {staticWidgets.map((widget) => (
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
  sectionWrap: {
    gap: mobileTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: mobileTheme.colors.primary,
    marginBottom: mobileTheme.spacing.xs,
  },
  freeHighlightCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: mobileTheme.radii.md,
    padding: mobileTheme.spacing.md,
  },
  freeHighlightText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  recCard: {
    backgroundColor: mobileTheme.colors.white,
    borderWidth: 1,
    borderColor: mobileTheme.colors.neutral100,
    borderRadius: mobileTheme.radii.lg,
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: mobileTheme.colors.primary,
    flex: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: mobileTheme.spacing.sm,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recTagline: {
    color: mobileTheme.colors.neutral600,
    fontSize: 13,
  },
  recReason: {
    color: mobileTheme.colors.secondary,
    fontSize: 12,
    lineHeight: 18,
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
