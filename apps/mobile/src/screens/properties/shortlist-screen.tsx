import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { featuredProperties } from '../../data/mock';
import { mobileTheme } from '../../theme';

export function ShortlistScreen() {
  const navigation = useNavigation<any>();

  return (
    <FeatureShell title="Shortlist" subtitle="Up to three properties can be carried into compare and routed trip planning." badge="Max 3">
      {featuredProperties.slice(0, 3).map((property, index) => (
        <Card key={property.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.position}>Stop {index + 1}</Text>
              <Text style={styles.title}>{property.title}</Text>
            </View>
            <Text style={styles.meta}>{property.rent}</Text>
          </View>
        </Card>
      ))}
      <Button label="Compare Properties" variant="secondary" onPress={() => navigation.navigate('Compare')} />
      <Button label="Request Viewing Trip" onPress={() => navigation.navigate('ViewingTrip')} />
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  position: { color: mobileTheme.colors.secondary },
  title: { color: mobileTheme.colors.primary, fontSize: 18, fontWeight: '700' },
  meta: { color: mobileTheme.colors.accent, fontWeight: '700' },
});