import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type HeaderUserControlProps = {
  isAuthenticated: boolean;
  imageUri?: string | null;
  userName: string;
  guestLabel: string;
  onPress: () => void;
};

export function HeaderUserControl({
  isAuthenticated,
  imageUri,
  userName,
  guestLabel,
  onPress,
}: HeaderUserControlProps) {
  const avatarSize = Platform.OS === 'web' ? 32 : 36;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        pressed ? styles.triggerDimmed : null,
        Platform.OS === 'web' ? (styles.webInteractive as any) : null,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
            isAuthenticated ? styles.avatarAuth : styles.avatarGuest,
          ]}
        >
          {isAuthenticated && imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderHead} />
              <View style={styles.placeholderBody} />
            </View>
          )}
        </View>

        <Text style={isAuthenticated ? styles.userName : styles.guestLabel} numberOfLines={1}>
          {isAuthenticated ? userName : guestLabel}
        </Text>

        {isAuthenticated ? (
          <View style={styles.bellWrap}>
            <View style={styles.bellBody}>
              <View style={styles.bellClapper} />
            </View>
            <View style={styles.bellBase} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    maxWidth: 150,
  },
  triggerDimmed: {
    opacity: 0.8,
  },
  webInteractive: {
    cursor: 'pointer',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBody: {
    width: 11,
    height: 9,
    borderWidth: 1.6,
    borderColor: '#374151',
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellClapper: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#374151',
    marginBottom: -2,
  },
  bellBase: {
    width: 8,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: '#374151',
    marginTop: 2,
  },
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAuth: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarGuest: {
    backgroundColor: '#F3F4F6',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeholderHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9CA3AF',
    marginBottom: 2,
  },
  placeholderBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#9CA3AF',
  },
  guestLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  userName: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});