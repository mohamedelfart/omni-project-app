import { create } from 'zustand';

type Role = 'tenant' | 'landlord' | 'admin' | 'provider';

type SessionState = {
  isAuthenticated: boolean;
  role: Role;
  locale: 'en' | 'ar';
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
  signInAsTenant: () => set({ isAuthenticated: true, role: 'tenant' }),
  signOut: () => set({ isAuthenticated: false, role: 'tenant', selectedPropertyId: undefined }),
  setLocale: (locale) => set({ locale }),
  setSelectedPropertyId: (selectedPropertyId) => set({ selectedPropertyId }),
}));
