import { create } from 'zustand';

import { LOCAL_PROPERTIES, LocalProperty } from '../data/local-properties';

type PropertyUiState = {
  savedUnitIds: string[];
  reservedUnitIds: string[];
  toggleSavedUnit: (propertyId: string) => void;
  reserveUnit: (propertyId: string) => void;
  removeReservedUnit: (propertyId: string) => void;
};

export const usePropertyUiStore = create<PropertyUiState>((set) => ({
  savedUnitIds: [],
  reservedUnitIds: [],
  toggleSavedUnit: (propertyId) =>
    set((state) => ({
      savedUnitIds: state.savedUnitIds.includes(propertyId)
        ? state.savedUnitIds.filter((id) => id !== propertyId)
        : [...state.savedUnitIds, propertyId],
    })),
  reserveUnit: (propertyId) =>
    set((state) => ({
      reservedUnitIds: state.reservedUnitIds.includes(propertyId)
        ? state.reservedUnitIds
        : [...state.reservedUnitIds, propertyId],
    })),
  removeReservedUnit: (propertyId) =>
    set((state) => ({
      reservedUnitIds: state.reservedUnitIds.filter((id) => id !== propertyId),
    })),
}));

export function getPropertyById(propertyId: string) {
  return LOCAL_PROPERTIES.find((property) => property.id === propertyId);
}

export function getPropertiesByIds(propertyIds: string[]): LocalProperty[] {
  return propertyIds
    .map((propertyId) => getPropertyById(propertyId))
    .filter((property): property is LocalProperty => Boolean(property));
}
