import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';
import { useSessionStore } from '../../store/session.store';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const signOut = useSessionStore((state) => state.signOut);

  return (
    <FeatureShell title="Profile" subtitle="Tenant identity, settings, support, and global account controls." badge="Account">
      <Card>
        <View style={styles.block}>
          <Text style={styles.title}>Nora Tenant</Text>
          <Text style={styles.text}>Doha, Qatar • Gold rewards tier • Insurance active</Text>
          <Button label="Contracts and Documents" variant="secondary" onPress={() => navigation.navigate('Contracts')} />
          <Button label="Sign Out" variant="ghost" onPress={signOut} />
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({ block: { gap: mobileTheme.spacing.sm }, title: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '700' }, text: { color: mobileTheme.colors.secondary, lineHeight: 22 } });