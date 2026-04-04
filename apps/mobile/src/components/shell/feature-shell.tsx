import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ScreenContainer } from '@quickrent/design-system';

import { mobileTheme } from '../../theme';

export function FeatureShell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.header}>
            {badge ? <Badge label={badge} tone="info" /> : null}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </Card>
        {children}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.xxxl,
  },
  header: {
    gap: mobileTheme.spacing.sm,
  },
  title: {
    color: mobileTheme.colors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: mobileTheme.colors.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
});