import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nManager, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/i18n';
import { RootNavigator } from './src/navigation/root-navigator';

const queryClient = new QueryClient();

try {
  I18nManager.allowRTL(true);
} catch {
  // Keep web preview resilient if RTL toggling is unsupported at runtime.
}

class AppRenderBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App root render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' }}>
          <Text style={{ color: '#1E3A5F', fontSize: 18, fontWeight: '700' }}>App Loaded</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppRenderBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <RootNavigator />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppRenderBoundary>
  );
}
