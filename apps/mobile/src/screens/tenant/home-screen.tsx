import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { OmniButton } from '../../components/omni-button';
import { OmniSkeleton } from '../../components/omni-skeleton';
import { PremiumSearchBar } from '../../components/premium-search-bar';
import { useSessionStore } from '../../store/session.store';
import { homeStyles as styles } from './home-screen.styles';

const FEATURED_PROPERTY = {
  title: 'Skyline Pearl Residence',
  location: 'West Bay, Doha',
  price: 'QAR 6,800 / month',
  image:
    'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=1400&q=80',
};

export function TenantHomeScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(18)).current;

  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, lift, loading]);

  const actionCards = useMemo(
    () => [
      {
        title: 'Book Viewing',
        body: 'Secure your slot instantly with guided support.',
        onPress: () => navigation.push('ViewingTrip'),
      },
      {
        title: 'Free Services',
        body: 'Unlock move-in support and tenant convenience perks.',
        onPress: () => navigation.push('MoveIn'),
      },
    ],
    [navigation],
  );

  const openProfile = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    navigation.push('Profile');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>OmniRent</Text>
            <Text style={styles.subtitle}>Premium living in Qatar and Texas</Text>
          </View>
          <TouchableOpacity onPress={openProfile} activeOpacity={0.85} style={styles.profileChip}>
            <Text style={styles.profileChipText}>ME</Text>
          </TouchableOpacity>
        </View>

        <Pressable onPress={() => navigation.push('PropertySearch')}>
          <PremiumSearchBar placeholder="Search luxury homes" />
        </Pressable>

        {loading ? (
          <View style={styles.card}>
            <OmniSkeleton height={220} radius={24} />
            <OmniSkeleton height={24} width="70%" style={{ marginTop: 16 }} />
            <OmniSkeleton height={16} width="44%" style={{ marginTop: 8 }} />
            <OmniSkeleton height={52} radius={16} style={{ marginTop: 18 }} />
          </View>
        ) : (
          <Animated.View style={{ opacity: fade, transform: [{ translateY: lift }] }}>
            <Text style={styles.sectionTitle}>Featured Property</Text>
            <View style={styles.card}>
              <View>
                <Image source={{ uri: FEATURED_PROPERTY.image }} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.floatingTag}>
                  <Text style={styles.floatingTagText}>Luxury Pick</Text>
                </View>
              </View>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{FEATURED_PROPERTY.title}</Text>
                <Text style={styles.heroMeta}>{FEATURED_PROPERTY.location}</Text>
                <Text style={styles.heroPrice}>{FEATURED_PROPERTY.price}</Text>
                <OmniButton
                  style={styles.cta}
                  label="Explore Property"
                  onPress={() => navigation.push('PropertyDetails')}
                />
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.actionGrid}>
          {actionCards.map((item) => (
            <TouchableOpacity key={item.title} activeOpacity={0.9} style={styles.actionCard} onPress={item.onPress}>
              <Text style={styles.actionTitle}>{item.title}</Text>
              <Text style={styles.actionText}>{item.body}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
