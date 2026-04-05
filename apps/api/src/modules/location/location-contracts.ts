// Normalized location context — shared shape used across Core, command center, and adapters.
// Source code should never construct raw lat/lng objects; always use this shape.

export type LocationSourceType =
  | 'property'
  | 'pickup'
  | 'dropoff'
  | 'service-site'
  | 'tenant-current'
  | 'vendor-current';

export interface NormalizedLocationContext {
  sourceType: LocationSourceType;
  lat: number;
  lng: number;
  address: string | null;
  placeLabel: string | null;
  city: string | null;
  district: string | null;
  countryCode: string | null;
}

export interface MapPreviewOptions {
  zoom?: number;
  width?: number;
  height?: number;
  markerLabel?: string;
}

export interface LocationAdapter {
  getMapPreviewUrl(lat: number, lng: number, options?: MapPreviewOptions): string;
  getOpenInMapsUrl(lat: number, lng: number, label?: string): string;
  formatAddress(addressLine1: string, city: string, district?: string | null, countryCode?: string | null): string;
  reverseGeocodeSummary(lat: number, lng: number): Promise<{ city: string | null; countryCode: string | null }>;
}
