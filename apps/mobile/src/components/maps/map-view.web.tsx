import { forwardRef, useImperativeHandle } from 'react';
import { View, ViewProps } from 'react-native';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: Array<{ latitude: number; longitude: number }>,
    options?: {
      edgePadding?: { top: number; right: number; bottom: number; left: number };
      animated?: boolean;
    },
  ) => void;
};

type MapViewProps = ViewProps & {
  initialRegion?: Region;
  region?: Region;
};

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapViewWeb({ children, ...props }, ref) {
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: () => undefined,
      fitToCoordinates: () => undefined,
    }),
    [],
  );

  return <View {...props}>{children}</View>;
});

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  children?: React.ReactNode;
  onPress?: () => void;
};

export function Marker({ children }: MarkerProps) {
  return <>{children ?? null}</>;
}

export default MapView;
