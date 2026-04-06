import React from 'react';
import { Text, View } from 'react-native';

export function VendorScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F766E',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}>Vendor Screen</Text>
    </View>
  );
}
