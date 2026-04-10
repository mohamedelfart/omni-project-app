import { LocalProperty } from '../../data/local-properties';

export type SearchFilters = {
  type: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  furnished: string;
  petFriendly: string;
  billsIncluded: string;
};

export type SearchSortMode = 'recommended' | 'priceAsc' | 'priceDesc';
export type SearchViewMode = 'list' | 'map';
export type RecommendationCode =
  | 'best_value'
  | 'best_for_families'
  | 'best_city_view'
  | 'top_furnished_pick';

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function parseBedroomLabel(bedrooms: number) {
  return bedrooms >= 4 ? '4+ BR' : `${bedrooms} BR`;
}

function parseBathroomLabel(bathrooms: number) {
  return bathrooms >= 3 ? '3+ Bath' : `${bathrooms} Bath`;
}

export function applyPropertyFilters(
  properties: LocalProperty[],
  rawQuery: string,
  filters: SearchFilters,
  sortMode: SearchSortMode = 'recommended',
) {
  const query = normalizeText(rawQuery);
  const selectedArea = filters.location === 'All Areas' ? 'All' : filters.location;

  const filtered = properties.filter((property) => {
    const bedroomsLabel = parseBedroomLabel(property.bedrooms);
    const bathroomsLabel = parseBathroomLabel(property.bathrooms);

    return (
      (filters.type === 'All' || property.type === filters.type) &&
      (filters.bedrooms === 'Any' || bedroomsLabel === filters.bedrooms) &&
      (filters.bathrooms === 'Any' || bathroomsLabel === filters.bathrooms) &&
      (selectedArea === 'All' || property.area === selectedArea) &&
      (filters.furnished === 'Any' || property.furnished === filters.furnished) &&
      (filters.petFriendly === 'Any' || property.petFriendly === filters.petFriendly) &&
      (filters.billsIncluded === 'Any' || property.billsIncluded === filters.billsIncluded) &&
      (query.length === 0 ||
        normalizeText(property.title).includes(query) ||
        normalizeText(property.location).includes(query) ||
        normalizeText(property.area).includes(query))
    );
  });

  if (sortMode === 'priceAsc') {
    return [...filtered].sort((a, b) => a.monthlyRentMinor - b.monthlyRentMinor);
  }

  if (sortMode === 'priceDesc') {
    return [...filtered].sort((a, b) => b.monthlyRentMinor - a.monthlyRentMinor);
  }

  return filtered;
}

export function applyPropertyFiltersWithBenchmark(
  properties: LocalProperty[],
  rawQuery: string,
  filters: SearchFilters,
  sortMode: SearchSortMode,
  benchmarkEnabled: boolean,
  benchmarkTag = 'search.filter',
) {
  if (!benchmarkEnabled) {
    return applyPropertyFilters(properties, rawQuery, filters, sortMode);
  }

  const startedAt = Date.now();
  const filtered = applyPropertyFilters(properties, rawQuery, filters, sortMode);
  const elapsedMs = Date.now() - startedAt;
  const level = elapsedMs > 50 ? 'warn' : 'info';
  console[level](`[${benchmarkTag}] ${elapsedMs}ms | results=${filtered.length}`);
  return filtered;
}

export function buildRecommendationLabels(properties: LocalProperty[]) {
  if (!properties.length) return {} as Record<string, RecommendationCode>;

  const bestValue = [...properties].sort(
    (a, b) => a.monthlyRentMinor / a.sizeSqm - b.monthlyRentMinor / b.sizeSqm,
  )[0];
  const bestFamily = [...properties].sort((a, b) => b.bedrooms - a.bedrooms)[0];
  const cityView = properties.find((p) => p.hasCityView);
  const furnishedPick = properties.find(
    (p) => p.furnished === 'Yes' && (p.area === 'The Pearl' || p.area === 'Lusail' || p.area === 'Msheireb'),
  );

  const labels: Record<string, RecommendationCode> = {};
  if (bestValue) labels[bestValue.id] = 'best_value';
  if (bestFamily) labels[bestFamily.id] = labels[bestFamily.id] ?? 'best_for_families';
  if (cityView) labels[cityView.id] = labels[cityView.id] ?? 'best_city_view';
  if (furnishedPick) labels[furnishedPick.id] = labels[furnishedPick.id] ?? 'top_furnished_pick';

  return labels;
}
