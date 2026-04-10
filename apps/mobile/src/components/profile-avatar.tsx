import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type ProfileAvatarProps = {
  imageUri?: string | null;
  onPress: () => void;
  size?: number;
  showOnlineIndicator?: boolean;
};

export function ProfileAvatar({
  imageUri,
  onPress,
  size = Platform.OS === 'web' ? 32 : 36,
  showOnlineIndicator = true,
}: ProfileAvatarProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => scale.stopAnimation();
  }, [scale]);

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => animateTo(1.05)}
      onHoverOut={() => animateTo(1)}
      style={[
        styles.pressable,
        { width: size, height: size },
        Platform.OS === 'web' ? styles.webCursor : null,
      ]}
    >
      <Animated.View style={[styles.outer, { width: size, height: size, transform: [{ scale }] }]}>
        <View style={[styles.frame, { borderRadius: size / 2 }]}> 
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderHead} />
              <View style={styles.placeholderBody} />
            </View>
          )}
        </View>
        {showOnlineIndicator ? <View style={styles.onlineDot} /> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    position: 'relative',
  },
  webCursor: {
    cursor: 'pointer',
  },
  outer: {
    position: 'relative',
  },
  frame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#EAF1FB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FB',
  },
  placeholderHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8FA6C1',
    marginBottom: 2,
  },
  placeholderBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#8FA6C1',
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});