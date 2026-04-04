import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { getShortlist, ViewingShortlistItem } from '../../lib/viewing-api';
import { mobileTheme } from '../../theme';

export function CompareScreen() {
  const [items, setItems] = useState<ViewingShortlistItem[]>([]);

  useEffect(() => {
    void getShortlist().then((shortlist) => setItems(shortlist.items)).catch(() => setItems([]));
  }, []);

  return (
    <FeatureShell title="Compare" subtitle="A single comparison surface across price, area, district, and service benefits." badge="Compare">
      {!items.length ? <EmptyState title="No shortlist to compare" description="Add at least two homes to compare pricing, area, and trip sequence." /> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <View style={styles.card}>
            <Text style={styles.title}>{item.property.title}</Text>
            <Text style={styles.meta}>{item.property.district ?? item.property.city}</Text>
            <Text style={styles.meta}>QAR {(item.property.monthlyRentMinor / 100).toLocaleString()} / month</Text>
            <Text style={styles.meta}>{item.property.bedrooms} bed • {item.property.areaSqm} sqm</Text>
          </View>
        </Card>
      ))}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: mobileTheme.spacing.xs },
  title: { color: mobileTheme.colors.primary, fontSize: 18, fontWeight: '700' },
  meta: { color: mobileTheme.colors.secondary },
});