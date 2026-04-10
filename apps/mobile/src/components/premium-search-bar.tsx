import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { mobileTheme } from '../theme';

type PremiumSearchBarProps = {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
};

export function PremiumSearchBar({ placeholder, value, onChangeText, editable = true }: PremiumSearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#8BA3C0"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
      />
      {value && value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText?.('')} activeOpacity={0.8} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: mobileTheme.radii.xl,
    backgroundColor: mobileTheme.colors.white,
    borderColor: mobileTheme.colors.neutral100,
    borderWidth: 1.5,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: 14,
    shadowColor: '#0D3059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  containerFocused: {
    borderColor: '#2C67AB',
    shadowColor: '#2C67AB',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 16,
    lineHeight: 20,
    color: '#5A7EA8',
  },
  input: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: '400',
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCE9F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: '#2C5787',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
