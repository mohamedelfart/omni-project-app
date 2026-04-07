import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        {canGoBack ? (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : null}
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
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: mobileTheme.colors.neutral100,
    backgroundColor: mobileTheme.colors.white,
  },
  backButtonText: {
    color: mobileTheme.colors.primary,
    fontWeight: '700',
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