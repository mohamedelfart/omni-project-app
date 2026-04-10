import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ScreenContainer } from '@quickrent/design-system';

import { mobileTheme } from '../../theme';

export function RegisterScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Create your QuickRent account</Text>
        <Text style={styles.subtitle}>Email, phone, verification, and profile completion are all first-class from day one.</Text>
      </View>
      <Card>
        <View style={styles.form}>
          <Input placeholder="Full name" />
          <Input placeholder="Email" />
          <Input placeholder="Phone number" />
          <Input placeholder="Password" secureTextEntry />
          <Button label="Create Account" onPress={() => navigation.navigate('Login')} />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: mobileTheme.spacing.sm, marginTop: 24 },
  title: { color: mobileTheme.colors.primary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: mobileTheme.colors.secondary, fontSize: 15, lineHeight: 22 },
  form: { gap: mobileTheme.spacing.sm },
});