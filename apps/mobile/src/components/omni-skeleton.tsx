import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type OmniSkeletonProps = {
  height: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function OmniSkeleton({
  height,
  width = '100%',
  radius = 12,
  style,
}: OmniSkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 280],
  });

  return (
    <View style={[styles.base, { height, width, borderRadius: radius }, style]}>
      <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#E8EDF3',
    overflow: 'hidden',
  },
  shimmer: {
    width: 120,
    height: '100%',
    backgroundColor: '#F6F8FB',
    opacity: 0.7,
  },
});
