declare module 'react-native-maps' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  export interface MapViewProps extends ViewProps {
    style?: any;
    region?: Region;
    initialRegion?: Region;
    children?: React.ReactNode;
  }

  export interface MarkerProps extends ViewProps {
    coordinate: {
      latitude: number;
      longitude: number;
    };
    onPress?: () => void;
    children?: React.ReactNode;
  }

  export class Marker extends React.Component<MarkerProps> {}

  export default class MapView extends React.Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
    fitToCoordinates(
      coordinates: Array<{ latitude: number; longitude: number }>,
      options?: {
        edgePadding?: { top: number; right: number; bottom: number; left: number };
        animated?: boolean;
      },
    ): void;
  }
}
