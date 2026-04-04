import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button, Card, Input, ScreenContainer } from '@quickrent/design-system';

import { mobileTheme } from '../../theme';
import { useSessionStore } from '../../store/session.store';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof schema>;

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const signInAsTenant = useSessionStore((state) => state.signInAsTenant);

  const { handleSubmit, setValue, watch } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = () => {
    signInAsTenant();
  };

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{t('auth.welcome')}</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Input
            placeholder={t('auth.email')}
            value={watch('email')}
            onChangeText={(v: string) => setValue('email', v, { shouldValidate: true })}
          />
          <Input
            placeholder={t('auth.password')}
            secureTextEntry
            value={watch('password')}
            onChangeText={(v: string) => setValue('password', v, { shouldValidate: true })}
          />
          <Button label={t('auth.signIn')} onPress={handleSubmit(onSubmit)} />
        </View>
      </Card>

      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Create account</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('OtpLogin')}>
          <Text style={styles.link}>Login with phone OTP</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.link}>Forgot password</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    padding: mobileTheme.spacing.xl,
    justifyContent: 'center',
    gap: mobileTheme.spacing.xl,
  },
  headerBlock: {
    gap: mobileTheme.spacing.sm,
    marginTop: 64,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    color: mobileTheme.colors.brandNavy,
  },
  subtitle: {
    color: mobileTheme.colors.neutral600,
    fontSize: 15,
  },
  form: {
    gap: mobileTheme.spacing.md,
  },
  links: {
    gap: mobileTheme.spacing.sm,
  },
  link: {
    color: mobileTheme.colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
