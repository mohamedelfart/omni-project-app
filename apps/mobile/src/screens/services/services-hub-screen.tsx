import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { serviceCards } from '../../data/mock';
import { mobileTheme } from '../../theme';

const destinations: Record<string, string> = {
  'Move-In': 'MoveIn',
  Maintenance: 'Maintenance',
  Cleaning: 'Cleaning',
  'Airport Transfer': 'AirportTransfer',
  'Paid Services': 'PaidServices',
};

export function ServicesHubScreen() {
  const navigation = useNavigation<any>();

  const handleOpenService = (title: string) => {
    navigation.push(destinations[title]);
  };

  return (
    <FeatureShell title="Services" subtitle="Free and paid service orchestration, all routed through core and visible to the command center." badge="Service Hub">
      {serviceCards.map((service) => (
        <Card key={service.title}>
          <View style={styles.card}>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.subtitle}>{service.subtitle}</Text>
            <Button label="Open" onPress={() => handleOpenService(service.title)} />
          </View>
        </Card>
      ))}
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: mobileTheme.spacing.sm },
  title: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: mobileTheme.colors.secondary, lineHeight: 22 },
});