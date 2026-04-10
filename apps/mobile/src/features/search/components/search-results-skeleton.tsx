import { StyleSheet, View } from 'react-native';

import { OmniSkeleton } from '../../../components/omni-skeleton';

type SearchResultsSkeletonProps = {
  cards?: number;
};

export function SearchResultsSkeleton({ cards = 3 }: SearchResultsSkeletonProps) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: cards }).map((_, index) => (
        <View key={`sk-${index}`} style={styles.card}>
          <OmniSkeleton height={210} radius={16} />
          <View style={styles.body}>
            <OmniSkeleton height={18} width="66%" radius={8} />
            <OmniSkeleton height={13} width="46%" radius={8} />
            <OmniSkeleton height={14} width="38%" radius={8} />
            <View style={styles.specsRow}>
              <OmniSkeleton height={12} width={56} radius={6} />
              <OmniSkeleton height={12} width={56} radius={6} />
              <OmniSkeleton height={12} width={56} radius={6} />
            </View>
            <OmniSkeleton height={36} width={120} radius={12} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  body: { padding: 12, gap: 8 },
  specsRow: { flexDirection: 'row', gap: 10 },
});
