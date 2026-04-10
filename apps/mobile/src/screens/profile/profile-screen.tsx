import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card } from '@quickrent/design-system';

import { FeatureShell } from '../../components/shell/feature-shell';
import { mobileTheme } from '../../theme';
import { useSessionStore } from '../../store/session.store';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { i18n } = useTranslation();
  const locale = useSessionStore((state) => state.locale);
  const setLocale = useSessionStore((state) => state.setLocale);
  const signOut = useSessionStore((state) => state.signOut);
  const isArabic = i18n.language === 'ar';

  const toggleLanguage = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(nextLocale);
    void i18n.changeLanguage(nextLocale);
  };

  return (
    <FeatureShell title="Profile" subtitle="Identity, activity, contracts, and controls in one clean space." badge="Account">
      <Card>
        <View style={styles.block}>
          <View style={[styles.headerRow, isArabic && styles.rtlRow]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>NT</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, isArabic && styles.rtlText]}>Nora Tenant</Text>
              <Text style={[styles.text, isArabic && styles.rtlText]}>Doha, Qatar</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.block}>
          <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>My Activity</Text>
          <Button label="Reserved Units" variant="secondary" onPress={() => navigation.navigate('BookingConfirmation')} />
          <Button label="My Viewings" variant="secondary" onPress={() => undefined} />
          <Button label="Saved Properties" variant="secondary" onPress={() => navigation.navigate('Compare')} />
        </View>
      </Card>

      <Card>
        <View style={styles.block}>
          <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>Contracts</Text>
          <Button label="Documents" variant="secondary" onPress={() => navigation.navigate('Contracts')} />
        </View>
      </Card>

      <Card>
        <View style={styles.block}>
          <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>Settings</Text>
          <Button label={`Language (${locale.toUpperCase()})`} variant="secondary" onPress={toggleLanguage} />
          <Button label="Notifications" variant="secondary" onPress={() => undefined} />
          <Button label="Help" variant="secondary" onPress={() => navigation.navigate('Community')} />
        </View>
      </Card>

      <Card>
        <View style={styles.block}>
          <Button label="Logout" variant="ghost" onPress={signOut} />
        </View>
      </Card>
    </FeatureShell>
  );
}

const styles = StyleSheet.create({
  block: { gap: mobileTheme.spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: mobileTheme.spacing.md },
  rtlRow: { flexDirection: 'row-reverse' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#CFE0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#1F2937', fontWeight: '700' },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: '#1F2937', fontSize: 22, fontWeight: '700' },
  sectionTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700' },
  text: { color: '#6B7280', lineHeight: 22 },
  rtlText: { textAlign: 'right' },
});