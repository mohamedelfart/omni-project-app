import { create } from 'zustand';
import { setApiAuthToken } from '../lib/api-client';

type Role = 'tenant' | 'landlord' | 'admin' | 'provider';

type SessionState = {
  isAuthenticated: boolean;
  role: Role;
  locale: 'en' | 'ar';
  apiToken?: string;
  selectedPropertyId?: string;
  signInAsTenant: () => void;
  signOut: () => void;
  setLocale: (locale: 'en' | 'ar') => void;
  setSelectedPropertyId: (propertyId?: string) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  role: 'tenant',
  locale: 'en',
  signInAsTenant: () => {
    const token = process.env.EXPO_PUBLIC_TENANT_JWT;
    setApiAuthToken(token);
    set({ isAuthenticated: true, role: 'tenant', apiToken: token });
  },
  signOut: () => {
    setApiAuthToken(undefined);
    set({
      isAuthenticated: false,
      role: 'tenant',
      apiToken: undefined,
      selectedPropertyId: undefined,
    });
  },
  setLocale: (locale) => set({ locale }),
  setSelectedPropertyId: (selectedPropertyId) => set({ selectedPropertyId }),
}));
