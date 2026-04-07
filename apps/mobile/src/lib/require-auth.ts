type AuthGuardOptions = {
  isAuthenticated: boolean;
  navigation: { navigate: (screen: string) => void };
  action: () => void;
};

export function requireAuth({
  isAuthenticated,
  navigation,
  action,
}: AuthGuardOptions) {
  if (!isAuthenticated) {
    navigation.navigate('Login');
    return;
  }

  action();
}
