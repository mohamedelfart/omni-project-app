import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { OmniSkeleton } from '../../components/omni-skeleton';
import { PremiumSearchBar } from '../../components/premium-search-bar';
import { LoginModal } from '../../components/auth/login-modal';
import { HeaderUserControl } from '../../components/header-user-control';
import { useSessionStore } from '../../store/session.store';
import { homeStyles as styles } from './home-screen.styles';

const PROPERTY_TYPES = ['All', 'Apartment', 'Studio', 'Villa'];
const BEDROOM_OPTIONS = ['Any', '1 BR', '2 BR', '3 BR', '4+ BR'];
const BATHROOM_OPTIONS = ['Any', '1 Bath', '2 Bath', '3+ Bath'];
const LOCATION_OPTIONS = ['All Areas', 'West Bay', 'The Pearl', 'Lusail', 'Al Waab'];
const FURNISHED_OPTIONS = ['Any', 'Yes', 'No'];

const PROPERTIES = [
  {
    id: 'p1',
    title: 'Pearl Bay Residences',
    location: 'The Pearl, Doha',
    area: 'The Pearl',
    price: 'QAR 7,200 / month',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
    ],
    bedrooms: 2,
    bathrooms: 2,
    furnished: 'Yes',
    sizeSqm: 145,
    type: 'Apartment',
    highlights: ['Sea View', 'Furnished'],
  },
  {
    id: 'p2',
    title: 'Azure Park Towers',
    location: 'West Bay, Doha',
    area: 'West Bay',
    price: 'QAR 6,450 / month',
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1486304873000-235643847519?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80',
    ],
    bedrooms: 1,
    bathrooms: 1,
    furnished: 'No',
    sizeSqm: 95,
    type: 'Studio',
    highlights: ['City View', 'Pet Friendly'],
  },
  {
    id: 'p3',
    title: 'Harbor Heights',
    location: 'Lusail Marina, Doha',
    area: 'Lusail',
    price: 'QAR 8,100 / month',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80',
    ],
    bedrooms: 3,
    bathrooms: 3,
    furnished: 'Yes',
    sizeSqm: 210,
    type: 'Villa',
    highlights: ['Private Pool', 'Furnished'],
  },
  {
    id: 'p4',
    title: 'Marina Bay Suites',
    location: 'Lusail, Doha',
    area: 'Lusail',
    price: 'QAR 5,900 / month',
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1400&q=80',
    ],
    bedrooms: 2,
    bathrooms: 1,
    furnished: 'No',
    sizeSqm: 105,
    type: 'Apartment',
    highlights: ['Gym Access', 'Concierge'],
  },
];

export function TenantHomeScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const setLocale = useSessionStore((state) => state.setLocale);
  const { width: screenWidth } = useWindowDimensions();
  const CARD_WIDTH = screenWidth - 40;

  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedBedrooms, setSelectedBedrooms] = useState('Any');
  const [selectedBathrooms, setSelectedBathrooms] = useState('Any');
  const [selectedLocation, setSelectedLocation] = useState('All Areas');
  const [selectedFurnished, setSelectedFurnished] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(18)).current;

  const isArabic = i18n.language === 'ar';
  const userName = isArabic ? 'نورا المستأجرة' : 'Nora Tenant';
  const guestLabel = isArabic ? 'تسجيل الدخول' : 'Sign In';
  const userAvatarUri = isAuthenticated
    ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    : null;

  const activeFilterCount = [
    selectedType !== 'All',
    selectedBedrooms !== 'Any',
    selectedBathrooms !== 'Any',
    selectedLocation !== 'All Areas',
    selectedFurnished !== 'Any',
  ].filter(Boolean).length;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [fade, lift, loading]);

  const filteredProperties = useMemo(() => {
    const selectedArea = selectedLocation === 'All Areas' ? 'All' : selectedLocation;
    return PROPERTIES.filter((p) => {
      const propBR = p.bedrooms >= 4 ? '4+ BR' : `${p.bedrooms} BR`;
      const propBath = p.bathrooms >= 3 ? '3+ Bath' : `${p.bathrooms} Bath`;
      return (
        (selectedType === 'All' || p.type === selectedType) &&
        (selectedBedrooms === 'Any' || propBR === selectedBedrooms) &&
        (selectedBathrooms === 'Any' || propBath === selectedBathrooms) &&
        (selectedArea === 'All' || p.area === selectedArea) &&
        (selectedFurnished === 'Any' || p.furnished === selectedFurnished) &&
        (searchText === '' ||
          p.title.toLowerCase().includes(searchText.toLowerCase()) ||
          p.location.toLowerCase().includes(searchText.toLowerCase()))
      );
    });
  }, [searchText, selectedType, selectedBedrooms, selectedBathrooms, selectedLocation, selectedFurnished]);

  const hasActiveFilters = activeFilterCount > 0 || searchText.length > 0;

  const resetFilters = () => {
    setSearchText('');
    setSelectedType('All');
    setSelectedBedrooms('Any');
    setSelectedBathrooms('Any');
    setSelectedLocation('All Areas');
    setSelectedFurnished('Any');
  };

  const onProfilePress = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    navigation.navigate('Profile');
  };

  const onLanguageChange = (language: 'en' | 'ar') => {
    setShowLanguageMenu(false);
    setLocale(language);
    void i18n.changeLanguage(language);
  };

  const furnishedLabel = (opt: string) => {
    if (opt === 'Yes') return t('filters.yes');
    if (opt === 'No') return t('filters.no');
    return opt;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <View style={styles.languageControlWrap}>
            <TouchableOpacity
              style={styles.langToggle}
              onPress={() => setShowLanguageMenu((prev) => !prev)}
              activeOpacity={0.85}
            >
              <Text style={styles.langToggleText}>{isArabic ? 'AR' : 'EN'} ▼</Text>
            </TouchableOpacity>
            {showLanguageMenu ? (
              <View style={styles.languageDropdown}>
                <TouchableOpacity
                  style={styles.languageOption}
                  onPress={() => onLanguageChange('en')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.languageOptionText}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.languageOption}
                  onPress={() => onLanguageChange('ar')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.languageOptionText}>Arabic</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            <HeaderUserControl
              isAuthenticated={isAuthenticated}
              imageUri={userAvatarUri}
              userName={userName}
              guestLabel={guestLabel}
              onPress={onProfilePress}
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={[styles.pageTitle, isArabic && styles.rtlText]}>{t('search.title')}</Text>
          <Text style={[styles.pageSubtitle, isArabic && styles.rtlText]}>{t('search.subtitle')}</Text>
        </View>

        {/* Search + Filter Row */}
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <PremiumSearchBar
              placeholder={t('search.placeholder')}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterIconBtn, activeFilterCount > 0 && styles.filterIconBtnActive]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.filterIconGlyph,
                activeFilterCount > 0 && styles.filterIconGlyphActive,
              ]}
            >
              {'\u2261'}
            </Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Results Row */}
        <View style={styles.resultsRow}>
          <Text style={[styles.resultsCount, isArabic && styles.rtlText]}>
            {loading ? '\u2014' : `${filteredProperties.length} ${t('search.propertiesFound')}`}
          </Text>
          {hasActiveFilters && !loading ? (
            <TouchableOpacity onPress={resetFilters} activeOpacity={0.8} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>{t('search.reset')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Cards */}
        {loading ? (
          <View style={styles.listWrap}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.card}>
                <OmniSkeleton height={220} radius={0} />
                <OmniSkeleton height={22} width="60%" style={{ marginTop: 14, marginHorizontal: 16 }} />
                <OmniSkeleton height={14} width="42%" style={{ marginTop: 8, marginHorizontal: 16 }} />
                <OmniSkeleton height={14} width="30%" style={{ marginTop: 8, marginHorizontal: 16 }} />
                <View style={styles.skeletonContactRow}>
                  <OmniSkeleton height={42} radius={12} style={{ flex: 1 }} />
                </View>
              </View>
            ))}
          </View>
        ) : filteredProperties.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\uD83C\uDFE0'}</Text>
            <Text style={[styles.emptyTitle, isArabic && styles.rtlText]}>
              {t('search.noProperties')}
            </Text>
            <TouchableOpacity style={styles.emptyResetBtn} onPress={resetFilters} activeOpacity={0.85}>
              <Text style={styles.emptyResetBtnText}>{t('search.clearFilters')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.listWrap, { opacity: fade, transform: [{ translateY: lift }] }]}>
            {filteredProperties.map((property) => (
              <TouchableOpacity
                key={property.id}
                activeOpacity={0.93}
                style={styles.card}
                onPress={() => navigation.push('PropertyDetails', { property })}
              >
                {/* Hero Image Carousel */}
                <View style={styles.imageWrap}>
                  <FlatList
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={property.images}
                    keyExtractor={(imgUrl, idx) => `${property.id}-${idx}`}
                    getItemLayout={(_d, idx) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * idx, index: idx })}
                    renderItem={({ item: imgUrl }) => (
                      <Image
                        source={{ uri: imgUrl }}
                        style={{ width: CARD_WIDTH, height: 220 }}
                        resizeMode="cover"
                      />
                    )}
                  />
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{property.type}</Text>
                  </View>
                  <View style={styles.cardDots}>
                    {property.images.map((_img, idx) => (
                      <View key={`${property.id}-dot-${idx}`} style={styles.cardDot} />
                    ))}
                  </View>
                </View>

                {/* Info */}
                <View style={styles.propertyContent}>
                  <Text style={[styles.propertyTitle, isArabic && styles.rtlText]} numberOfLines={1}>
                    {property.title}
                  </Text>
                  <Text style={[styles.propertyMeta, isArabic && styles.rtlText]} numberOfLines={1}>
                    {'\uD83D\uDCCD'} {property.location}
                  </Text>
                  <Text style={[styles.propertyPrice, isArabic && styles.rtlText]}>{property.price}</Text>
                </View>

                {/* Stats */}
                <View style={styles.statsStrip}>
                  <View style={styles.statPill}>
                    <Text style={styles.statText}>{property.bedrooms} BR</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statPill}>
                    <Text style={styles.statText}>{property.bathrooms} Bath</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statPill}>
                    <Text style={styles.statText}>{property.sizeSqm} sqm</Text>
                  </View>
                </View>

                {/* Highlights */}
                <View style={styles.highlightRow}>
                  {property.highlights.map((h) => (
                    <View key={h} style={styles.highlightBadge}>
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                <View style={styles.contactRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.contactButtonPrimary}
                    onPress={() => navigation.push('PropertyDetails', { property })}
                  >
                    <Text style={styles.contactButtonPrimaryText}>{t('search.viewDetails')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <TouchableOpacity
          style={styles.filterOverlay}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}
        >
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1} onPress={() => undefined}>
            <View style={styles.filterSheetHandle} />
            <Text style={styles.filterSheetTitle}>Filter Properties</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionLabel}>{t('filters.type')}</Text>
              <View style={styles.chipRow}>
                {PROPERTY_TYPES.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selectedType === opt && styles.chipActive]}
                    onPress={() => setSelectedType(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedType === opt && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionLabel}>{t('filters.bedrooms')}</Text>
              <View style={styles.chipRow}>
                {BEDROOM_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selectedBedrooms === opt && styles.chipActive]}
                    onPress={() => setSelectedBedrooms(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedBedrooms === opt && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionLabel}>{t('filters.bathrooms')}</Text>
              <View style={styles.chipRow}>
                {BATHROOM_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selectedBathrooms === opt && styles.chipActive]}
                    onPress={() => setSelectedBathrooms(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedBathrooms === opt && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionLabel}>{t('filters.area')}</Text>
              <View style={styles.chipRow}>
                {LOCATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selectedLocation === opt && styles.chipActive]}
                    onPress={() => setSelectedLocation(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedLocation === opt && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionLabel}>{t('filters.furnished')}</Text>
              <View style={styles.chipRow}>
                {FURNISHED_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selectedFurnished === opt && styles.chipActive]}
                    onPress={() => setSelectedFurnished(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selectedFurnished === opt && styles.chipTextActive]}>
                      {furnishedLabel(opt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.filterResetBtn} onPress={resetFilters} activeOpacity={0.85}>
                <Text style={styles.filterResetBtnText}>{t('search.reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.filterApplyBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        isArabic={isArabic}
      />
    </SafeAreaView>
  );
}
