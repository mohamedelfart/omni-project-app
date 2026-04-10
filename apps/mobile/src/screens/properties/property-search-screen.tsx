import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { MapViewHandle, Marker, Region } from '../../components/maps/map-view';

import { LoginModal } from '../../components/auth/login-modal';
import { HeaderUserControl } from '../../components/header-user-control';
import { LOCAL_PROPERTIES } from '../../data/local-properties';
import {
  applyPropertyFiltersWithBenchmark,
  buildRecommendationLabels,
  RecommendationCode,
  SearchFilters,
  SearchSortMode,
} from '../../features/search/filtering-pipeline';
import { PropertyCard } from '../../features/search/components/property-card';
import { SearchResultsSkeleton } from '../../features/search/components/search-results-skeleton';
import { useSessionStore } from '../../store/session.store';
import { getPropertiesByIds, usePropertyUiStore } from '../../store/property-ui.store';

type FilterOption = { value: string; label: string };
type MapMarkerModel = {
  property: (typeof LOCAL_PROPERTIES)[number];
  coordinate: { latitude: number; longitude: number };
  pinLabel: string;
};

const AREA_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'The Pearl': { latitude: 25.3706, longitude: 51.5508 },
  Lusail: { latitude: 25.4210, longitude: 51.5140 },
  Msheireb: { latitude: 25.2853, longitude: 51.5274 },
  Austin: { latitude: 30.2672, longitude: -97.7431 },
  Houston: { latitude: 29.7604, longitude: -95.3698 },
};

function getPropertyCoordinate(propertyId: string, area: string) {
  const base = AREA_COORDINATES[area] ?? { latitude: 25.2854, longitude: 51.5310 };
  const seed = propertyId.charCodeAt(propertyId.length - 1) % 10;
  const drift = seed * 0.0018;

  return {
    latitude: base.latitude + drift,
    longitude: base.longitude - drift,
  };
}

function getPinLabel(price: string) {
  return price.split('/')[0].trim();
}

export function PropertySearchScreen() {
  const navigation = useNavigation<any>();
  const { i18n, t } = useTranslation();
  const mapRef = useRef<MapViewHandle | null>(null);
  const applyLocale = useSessionStore((state) => state.setLocale);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  const savedUnitIds = usePropertyUiStore((state) => state.savedUnitIds);
  const toggleSavedUnit = usePropertyUiStore((state) => state.toggleSavedUnit);

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedBedrooms, setSelectedBedrooms] = useState('Any');
  const [selectedBathrooms, setSelectedBathrooms] = useState('Any');
  const [selectedLocation, setSelectedLocation] = useState('All Areas');
  const [selectedFurnished, setSelectedFurnished] = useState('Any');
  const [selectedPetFriendly, setSelectedPetFriendly] = useState('Any');
  const [selectedBillsIncluded, setSelectedBillsIncluded] = useState('Any');
  const [sortMode, setSortMode] = useState<SearchSortMode>('recommended');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSavedSheet, setShowSavedSheet] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState<string | null>(null);
  const [isMiniCardVisible, setIsMiniCardVisible] = useState(false);
  const [miniCardMarker, setMiniCardMarker] = useState<MapMarkerModel | null>(null);

  const miniCardAnim = useState(new Animated.Value(0))[0];

  const isArabic = i18n.language === 'ar';
  const userName = isArabic ? 'نورا المستأجرة' : 'Nora Tenant';
  const userAvatarUri = isAuthenticated
    ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    : null;

  const guestLabel = t('auth.signIn');

  const sortOptions = useMemo(
    () => [
      { value: 'recommended' as SearchSortMode, label: t('search.sort.recommended') },
      { value: 'priceAsc' as SearchSortMode, label: t('search.sort.priceAsc') },
      { value: 'priceDesc' as SearchSortMode, label: t('search.sort.priceDesc') },
    ],
    [t, i18n.language],
  );

  const recommendationTextByCode = useMemo(
    () => ({
      best_value: t('search.reco.bestValue'),
      best_for_families: t('search.reco.bestForFamilies'),
      best_city_view: t('search.reco.bestCityView'),
      top_furnished_pick: t('search.reco.topFurnishedPick'),
    }),
    [t, i18n.language],
  );

  const filterTypeOptions = useMemo(
    () => [
      { value: 'All', label: t('search.filterValues.all') },
      { value: 'Apartment', label: t('search.filterValues.apartment') },
      { value: 'Studio', label: t('search.filterValues.studio') },
      { value: 'Villa', label: t('search.filterValues.villa') },
    ],
    [t, i18n.language],
  );

  const filterBedroomOptions = useMemo(
    () => [
      { value: 'Any', label: t('search.filterValues.any') },
      { value: '1 BR', label: t('search.filterValues.bed1') },
      { value: '2 BR', label: t('search.filterValues.bed2') },
      { value: '3 BR', label: t('search.filterValues.bed3') },
      { value: '4+ BR', label: t('search.filterValues.bed4Plus') },
    ],
    [t, i18n.language],
  );

  const filterBathroomOptions = useMemo(
    () => [
      { value: 'Any', label: t('search.filterValues.any') },
      { value: '1 Bath', label: t('search.filterValues.bath1') },
      { value: '2 Bath', label: t('search.filterValues.bath2') },
      { value: '3+ Bath', label: t('search.filterValues.bath3Plus') },
    ],
    [t, i18n.language],
  );

  const filterLocationOptions = useMemo(
    () => [
      { value: 'All Areas', label: t('search.filterValues.allAreas') },
      { value: 'The Pearl', label: t('search.filterValues.thePearl') },
      { value: 'Lusail', label: t('search.filterValues.lusail') },
      { value: 'Msheireb', label: t('search.filterValues.msheireb') },
      { value: 'Austin', label: t('search.filterValues.austin') },
      { value: 'Houston', label: t('search.filterValues.houston') },
    ],
    [t, i18n.language],
  );

  const filterFurnishedOptions = useMemo(
    () => [
      { value: 'Any', label: t('search.filterValues.any') },
      { value: 'Yes', label: t('filters.yes') },
      { value: 'No', label: t('filters.no') },
    ],
    [t, i18n.language],
  );

  const filterPetFriendlyOptions = useMemo(
    () => [
      { value: 'Any', label: t('search.filterValues.any') },
      { value: 'Yes', label: t('filters.yes') },
      { value: 'No', label: t('filters.no') },
    ],
    [t, i18n.language],
  );

  const filterBillsIncludedOptions = useMemo(
    () => [
      { value: 'Any', label: t('search.filterValues.any') },
      { value: 'Yes', label: t('filters.yes') },
      { value: 'No', label: t('filters.no') },
    ],
    [t, i18n.language],
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => setDebouncedQuery(searchText), 150);
    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  useEffect(() => {
    const mountedAt = Date.now();
    let closed = false;
    let minTimer: ReturnType<typeof setTimeout> | null = null;

    // Keep skeleton briefly for visual stability, but force close by 3s max.
    const maxTimer = setTimeout(() => {
      if (!closed) setIsInitialLoading(false);
    }, 3000);

    Promise.resolve().finally(() => {
      const elapsed = Date.now() - mountedAt;
      const minVisible = Math.max(450 - elapsed, 0);
      minTimer = setTimeout(() => {
        if (!closed) setIsInitialLoading(false);
      }, minVisible);
    });

    return () => {
      closed = true;
      clearTimeout(maxTimer);
      if (minTimer) clearTimeout(minTimer);
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const filters: SearchFilters = {
      type: selectedType,
      bedrooms: selectedBedrooms,
      bathrooms: selectedBathrooms,
      location: selectedLocation,
      furnished: selectedFurnished,
      petFriendly: selectedPetFriendly,
      billsIncluded: selectedBillsIncluded,
    };

    return applyPropertyFiltersWithBenchmark(
      LOCAL_PROPERTIES,
      debouncedQuery,
      filters,
      sortMode,
      __DEV__,
      'property-search.pipeline',
    );
  }, [debouncedQuery, selectedType, selectedBedrooms, selectedBathrooms, selectedLocation, selectedFurnished, selectedPetFriendly, selectedBillsIncluded, sortMode]);

  const recommendationLabels = useMemo(() => buildRecommendationLabels(filteredProperties), [filteredProperties]);

  const mapMarkers = useMemo(() => {
    const startedAt = Date.now();

    const markers: MapMarkerModel[] = filteredProperties.map((property) => ({
      property,
      coordinate: getPropertyCoordinate(property.id, property.area),
      pinLabel: getPinLabel(property.price),
    }));

    if (__DEV__) {
      const elapsedMs = Date.now() - startedAt;
      const level = elapsedMs > 300 ? 'warn' : 'info';
      console[level](`[property-search.map] ${elapsedMs}ms | pins=${markers.length}`);
    }

    return markers;
  }, [filteredProperties]);

  const mapRegion = useMemo<Region>(() => {
    const first = mapMarkers[0]?.coordinate ?? { latitude: 25.2854, longitude: 51.5310 };

    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.14,
      longitudeDelta: 0.14,
    };
  }, [mapMarkers]);

  const selectedMapMarker = useMemo(
    () => mapMarkers.find((marker) => marker.property.id === selectedMapPropertyId),
    [mapMarkers, selectedMapPropertyId],
  );

  useEffect(() => {
    if (!selectedMapPropertyId) return;

    const markerStillExists = mapMarkers.some((marker) => marker.property.id === selectedMapPropertyId);
    if (!markerStillExists) {
      setSelectedMapPropertyId(null);
    }
  }, [mapMarkers, selectedMapPropertyId]);

  useEffect(() => {
    if (Platform.OS === 'web' || viewMode !== 'map') return;

    const instance = mapRef.current;
    if (!instance || mapMarkers.length === 0) return;

    if (mapMarkers.length === 1) {
      const [onlyMarker] = mapMarkers;
      instance.animateToRegion(
        {
          latitude: onlyMarker.coordinate.latitude,
          longitude: onlyMarker.coordinate.longitude,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        },
        300,
      );
      return;
    }

    instance.fitToCoordinates(
      mapMarkers.map((marker) => marker.coordinate),
      {
        edgePadding: { top: 56, right: 56, bottom: 220, left: 56 },
        animated: true,
      },
    );
  }, [mapMarkers, viewMode]);

  useEffect(() => {
    if (selectedMapMarker) {
      setMiniCardMarker(selectedMapMarker);
      setIsMiniCardVisible(true);
      Animated.timing(miniCardAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!isMiniCardVisible) return;

    Animated.timing(miniCardAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMiniCardVisible(false);
        setMiniCardMarker(null);
      }
    });
  }, [isMiniCardVisible, miniCardAnim, selectedMapMarker]);

  const savedUnits = useMemo(() => getPropertiesByIds(savedUnitIds), [savedUnitIds]);

  const onLanguageChange = (language: 'en' | 'ar') => {
    applyLocale(language);
    void i18n.changeLanguage(language);
    setShowLanguageMenu(false);
  };

  const onToggleFavorite = (propertyId: string) => {
    const wasSaved = savedUnitIds.includes(propertyId);
    toggleSavedUnit(propertyId);

    if (!wasSaved && savedUnitIds.length === 0) {
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 1800);
    }
  };

  const resetFilters = () => {
    setSelectedType('All');
    setSelectedBedrooms('Any');
    setSelectedBathrooms('Any');
    setSelectedLocation('All Areas');
    setSelectedFurnished('Any');
    setSelectedPetFriendly('Any');
    setSelectedBillsIncluded('Any');
  };

  const onHeaderUserPress = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    navigation.navigate('Profile');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.stickyHeader}>
        <View style={styles.topBar}>
          <View style={styles.languageControlWrap}>
            <TouchableOpacity style={styles.langToggle} onPress={() => setShowLanguageMenu((prev) => !prev)} activeOpacity={0.85}>
              <Text style={styles.langToggleText}>{isArabic ? 'AR' : 'EN'} ▾</Text>
            </TouchableOpacity>
            {showLanguageMenu ? (
              <View style={styles.languageDropdown}>
                <TouchableOpacity style={styles.languageOption} onPress={() => onLanguageChange('en')} activeOpacity={0.8}>
                  <Text style={styles.languageOptionText}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.languageOption} onPress={() => onLanguageChange('ar')} activeOpacity={0.8}>
                  <Text style={styles.languageOptionText}>العربية</Text>
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
              onPress={onHeaderUserPress}
            />
          </View>
        </View>

        <View style={styles.searchFilterRow}>
          <View style={[styles.searchWrap, isSearchFocused && styles.searchWrapFocused]}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('search.placeholder')}
              placeholderTextColor="#8A98AB"
              style={styles.searchInput}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)} activeOpacity={0.85}>
            <Text style={styles.filterBtnText}>≡</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resultsToolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.toolbarChip, sortMode === option.value && styles.toolbarChipActive]}
                onPress={() => setSortMode(option.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.toolbarChipText, sortMode === option.value && styles.toolbarChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.viewToggleWrap, isArabic && styles.rtlRow]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.85}
            >
              <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
                {t('search.viewMode.list')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.85}
            >
              <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>
                {t('search.viewMode.map')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {isInitialLoading ? (
          <SearchResultsSkeleton cards={3} />
        ) : viewMode === 'map' ? (
          <View style={styles.mapBlock}>
            {filteredProperties.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t('search.map.noPropertiesInArea')}</Text>
              </View>
            ) : Platform.OS === 'web' ? (
              <View style={styles.mapPlaceholderCard}>
                <Text style={styles.mapPlaceholderTitle}>{t('search.map.title')}</Text>
                <Text style={styles.mapPlaceholderSub}>{t('search.map.subtitle')}</Text>
              </View>
            ) : (
              <View style={styles.mapCanvasWrap}>
                <MapView
                  ref={(instance: MapViewHandle | null) => {
                    mapRef.current = instance;
                  }}
                  style={styles.mapCanvas}
                  initialRegion={mapRegion}
                >
                  {mapMarkers.map((marker) => (
                    <Marker
                      key={marker.property.id}
                      coordinate={marker.coordinate}
                      onPress={() => setSelectedMapPropertyId(marker.property.id)}
                    >
                      <View style={styles.priceMarker}>
                        <Text style={styles.priceMarkerText}>{marker.pinLabel}</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>

                {isMiniCardVisible && miniCardMarker ? (
                  <Animated.View
                    style={[
                      styles.mapSelectedCard,
                      {
                        opacity: miniCardAnim,
                        transform: [
                          {
                            translateY: miniCardAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [14, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                    pointerEvents={selectedMapMarker ? 'auto' : 'none'}
                  >
                    <Image
                      source={{ uri: miniCardMarker.property.images[0] }}
                      style={styles.mapSelectedImage}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.mapSelectedTitle} numberOfLines={1}>
                        {miniCardMarker.property.title}
                      </Text>
                      <Text style={styles.mapSelectedMeta} numberOfLines={1}>
                        {miniCardMarker.property.location}
                      </Text>
                      <Text style={styles.mapSelectedPrice}>{miniCardMarker.pinLabel}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.mapSelectedBtn}
                      onPress={() => navigation.push('PropertyDetails', { property: miniCardMarker.property })}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.mapSelectedBtnText}>{t('search.viewDetails')}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : null}
              </View>
            )}
          </View>
        ) : filteredProperties.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('search.noProperties')}</Text>
          </View>
        ) : (
          <View style={styles.cardsWrap}>
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                recommendationLabel={recommendationTextByCode[recommendationLabels[property.id] as RecommendationCode]}
                specLabels={{
                  bed: t('search.spec.bed'),
                  bath: t('search.spec.bath'),
                  sizeUnit: t('search.spec.sizeUnit'),
                }}
                saved={savedUnitIds.includes(property.id)}
                onToggleFavorite={() => onToggleFavorite(property.id)}
                onViewDetails={() => navigation.push('PropertyDetails', { property })}
                viewDetailsLabel={t('search.viewDetails')}
                isRtl={isArabic}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {savedUnits.length > 0 ? (
        <TouchableOpacity style={styles.savedBar} onPress={() => setShowSavedSheet(true)} activeOpacity={0.9}>
          <Text style={styles.savedBarText}>{isArabic ? `${savedUnits.length} ${t('search.savedUnits')}` : `${t('search.savedUnits')} (${savedUnits.length})`}</Text>
        </TouchableOpacity>
      ) : null}

      {showSavedToast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{t('search.addedToast')}</Text>
        </View>
      ) : null}

      <Modal visible={showSavedSheet} transparent animationType="slide" onRequestClose={() => setShowSavedSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.savedSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('search.savedSheetTitle')}</Text>
              <TouchableOpacity onPress={() => setShowSavedSheet(false)} activeOpacity={0.8}>
                <Text style={styles.sheetClose}>{t('search.close')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {savedUnits.map((property) => (
                <View key={property.id} style={styles.savedItemCard}>
                  <Image source={{ uri: property.images[0] }} style={styles.savedItemImage} resizeMode="cover" />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.savedItemTitle} numberOfLines={1}>{property.title}</Text>
                    <Text style={styles.savedItemMeta} numberOfLines={1}>{property.location}</Text>
                    <Text style={styles.savedItemPrice}>{property.price}</Text>
                    <View style={styles.savedItemActions}>
                      <TouchableOpacity onPress={() => navigation.push('PropertyDetails', { property })} activeOpacity={0.8}>
                        <Text style={styles.savedAction}>{t('search.view')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleSavedUnit(property.id)} activeOpacity={0.8}>
                        <Text style={styles.savedAction}>{t('search.remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.compareBtn, savedUnits.length < 2 && styles.compareBtnDisabled]}
              disabled={savedUnits.length < 2}
              onPress={() => {
                setShowSavedSheet(false);
                navigation.push('Compare');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.compareBtnText}>{t('search.compare')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1} onPress={() => undefined}>
            <Text style={styles.filterTitle}>{t('search.filters')}</Text>

            <FilterGroup title={t('filters.type')} options={filterTypeOptions} selected={selectedType} onSelect={(value) => { setSelectedType(value); setShowFilters(false); }} />
            <FilterGroup title={t('filters.bedrooms')} options={filterBedroomOptions} selected={selectedBedrooms} onSelect={(value) => { setSelectedBedrooms(value); setShowFilters(false); }} />
            <FilterGroup title={t('filters.bathrooms')} options={filterBathroomOptions} selected={selectedBathrooms} onSelect={(value) => { setSelectedBathrooms(value); setShowFilters(false); }} />
            <FilterGroup title={t('filters.area')} options={filterLocationOptions} selected={selectedLocation} onSelect={(value) => { setSelectedLocation(value); setShowFilters(false); }} />
            <FilterGroup title={t('filters.furnished')} options={filterFurnishedOptions} selected={selectedFurnished} onSelect={(value) => { setSelectedFurnished(value); setShowFilters(false); }} />
            <FilterGroup title={t('filters.petFriendly')} options={filterPetFriendlyOptions} selected={selectedPetFriendly} onSelect={(value) => { setSelectedPetFriendly(value); setShowFilters(false); }} />
            <FilterGroup title={t('filters.billsIncluded')} options={filterBillsIncludedOptions} selected={selectedBillsIncluded} onSelect={(value) => { setSelectedBillsIncluded(value); setShowFilters(false); }} />

            <View style={styles.filterActionRow}>
              <TouchableOpacity style={styles.filterResetBtn} onPress={resetFilters} activeOpacity={0.85}>
                <Text style={styles.filterResetText}>{t('search.resetFilters')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterDoneBtn} onPress={() => setShowFilters(false)} activeOpacity={0.85}>
                <Text style={styles.filterDoneText}>{t('search.done')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <LoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} isArabic={isArabic} />
    </SafeAreaView>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.filterSectionLabel}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.filterChip, selected === option.value && styles.filterChipActive]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterChipText, selected === option.value && styles.filterChipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC' },
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF6',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    zIndex: 20,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rtlRow: { flexDirection: 'row-reverse' },
  languageControlWrap: { position: 'relative' },
  langToggle: { borderRadius: 10, borderWidth: 1, borderColor: '#D8E2EF', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFFFFF' },
  langToggleText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  languageDropdown: {
    position: 'absolute',
    top: 34,
    right: 0,
    minWidth: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 30,
  },
  languageOption: { paddingHorizontal: 12, paddingVertical: 10 },
  languageOptionText: { color: '#1F2937', fontSize: 13, fontWeight: '500' },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  resultsToolbar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sortRow: { gap: 8, paddingRight: 8 },
  toolbarChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolbarChipActive: { backgroundColor: '#EEF4FF', borderColor: '#C7D8F6' },
  toolbarChipText: { color: '#4F6785', fontSize: 12, fontWeight: '600' },
  toolbarChipTextActive: { color: '#344B67' },
  viewToggleWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  viewToggleBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  viewToggleBtnActive: { backgroundColor: '#EEF4FF' },
  viewToggleText: { color: '#5F7693', fontSize: 12, fontWeight: '600' },
  viewToggleTextActive: { color: '#344B67' },
  searchWrap: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    backgroundColor: '#F7F9FC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchWrapFocused: {
    borderColor: '#5B8DEF',
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 0,
  },
  searchIcon: { color: '#8A98AB', fontSize: 14 },
  searchInput: {
    color: '#1F2937',
    fontSize: 13,
    flex: 1,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineColor: 'transparent' } as object) : {}),
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '700' },

  content: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 86 },
  mapBlock: { marginBottom: 12 },
  mapCanvasWrap: {
    height: 440,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DFE8F3',
    backgroundColor: '#FFFFFF',
  },
  mapCanvas: { flex: 1 },
  priceMarker: {
    minWidth: 64,
    borderRadius: 10,
    backgroundColor: '#102338',
    borderWidth: 1,
    borderColor: '#365987',
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  priceMarkerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  mapSelectedCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE8F3',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  mapSelectedImage: { width: 60, height: 60, borderRadius: 10 },
  mapSelectedTitle: { color: '#1F2937', fontSize: 13, fontWeight: '700' },
  mapSelectedMeta: { color: '#6B7280', fontSize: 11 },
  mapSelectedPrice: { color: '#2F80ED', fontSize: 12, fontWeight: '700' },
  mapSelectedBtn: {
    borderRadius: 10,
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mapSelectedBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  mapPlaceholderCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DFE8F3',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  mapPlaceholderTitle: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  mapPlaceholderSub: { color: '#6B7280', fontSize: 12 },
  cardsWrap: { gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: { transform: [{ scale: 0.99 }] },
  imageWrap: { height: 210, position: 'relative' },
  cardImage: { width: '100%', height: 210 },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(16,33,56,0.72)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  favoriteWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#DEE7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: { color: '#B8C2CC', fontSize: 14, fontWeight: '700' },
  favoriteIconActive: { color: '#5B8DEF' },

  cardBody: { padding: 12, gap: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700', flex: 1 },
  recoLabel: {
    color: '#4A6A96',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#EEF4FD',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cardLocation: { color: '#6B7280', fontSize: 13 },
  cardPrice: { color: '#2F80ED', fontSize: 16, fontWeight: '700' },
  specsRow: { flexDirection: 'row', gap: 10 },
  specItem: { color: '#4B607B', fontSize: 12, fontWeight: '600' },
  viewDetailsBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    opacity: 0.95,
  },
  viewDetailsText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DFE8F3',
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
  },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },

  savedBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E2F3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  savedBarText: { color: '#486996', fontSize: 13, fontWeight: '700' },

  toast: {
    position: 'absolute',
    bottom: 66,
    alignSelf: 'center',
    backgroundColor: '#102338',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: { color: '#FFFFFF', fontSize: 12 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(8,22,46,0.35)', justifyContent: 'flex-end' },
  savedSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE6F2',
    padding: 14,
    gap: 12,
    maxHeight: '72%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700' },
  sheetClose: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  savedItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE8F3',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
    flexDirection: 'row',
  },
  savedItemImage: { width: 64, height: 64, borderRadius: 10 },
  savedItemTitle: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  savedItemMeta: { color: '#6B7280', fontSize: 12 },
  savedItemPrice: { color: '#2F80ED', fontSize: 12, fontWeight: '700' },
  savedItemActions: { flexDirection: 'row', gap: 12, marginTop: 2 },
  savedAction: { color: '#486996', fontSize: 12, fontWeight: '600' },
  compareBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  compareBtnDisabled: { opacity: 0.45 },
  compareBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  filterOverlay: { flex: 1, backgroundColor: 'rgba(8,22,46,0.16)', justifyContent: 'flex-start' },
  filterSheet: {
    marginTop: 108,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2EAF4',
    padding: 12,
    gap: 10,
  },
  filterTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  filterSectionLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  filterChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: '#EEF4FF', borderColor: '#C7D8F6' },
  filterChipText: { color: '#4F6785', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#344B67' },
  filterActionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterResetBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    backgroundColor: '#FFFFFF',
  },
  filterResetText: { color: '#5F7693', fontSize: 12, fontWeight: '700' },
  filterDoneBtn: {
    flex: 1,
    borderRadius: 10,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B8DEF',
  },
  filterDoneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
