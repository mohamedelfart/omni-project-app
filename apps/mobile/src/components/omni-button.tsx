import { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type OmniButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OmniButton({ label, onPress, disabled = false, style }: OmniButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          disabled ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.gradientLayer} />
        <View style={styles.glowLayer} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#1A365D',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.96,
  },
  disabled: {
    opacity: 0.45,
  },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2B6CB0',
    opacity: 0.45,
  },
  glowLayer: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -90,
    top: -150,
    backgroundColor: '#8AB4E8',
    opacity: 0.22,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
