import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { communityHighlights } from '../../data/mock';
import { mobileTheme } from '../../theme';

export function CommunityScreen() {
  return (
    <FeatureShell title="Community" subtitle="Resident conversation, moderation, and local activation moments." badge="Community">
      {communityHighlights.map((item) => (
        <Card key={item}>
          <View style={styles.item}><Text style={styles.text}>{item}</Text></View>
        </Card>
      ))}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({ item: { gap: mobileTheme.spacing.sm }, text: { color: mobileTheme.colors.secondary, lineHeight: 22 } });