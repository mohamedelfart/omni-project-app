import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 16 },

  // Header
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EDF7',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rtlRow: { flexDirection: 'row-reverse' },
  pageTitle: { color: '#1F2937', fontSize: 24, fontWeight: '700', letterSpacing: -0.3, lineHeight: 30 },
  pageSubtitle: { color: '#6B7280', fontSize: 14, fontWeight: '400', marginTop: 2 },
  languageControlWrap: { position: 'relative' },
  langToggle: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D4E1F2',
    backgroundColor: '#FFFFFF',
  },
  langToggleText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  languageDropdown: {
    position: 'absolute',
    top: 34,
    right: 0,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E4F3',
    shadowColor: '#0A2440',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 20,
  },
  languageOption: { paddingHorizontal: 12, paddingVertical: 10 },
  languageOptionText: { color: '#1F2937', fontSize: 13, fontWeight: '500' },
  rtlText: { textAlign: 'right' },

  // Search + filter row
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterIconBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE8F5',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A2440', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  filterIconBtnActive: { backgroundColor: '#2F80ED', borderColor: '#2F80ED' },
  filterIconGlyph: { color: '#2F80ED', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  filterIconGlyphActive: { color: '#FFFFFF' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: '#E84040', alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  // Filter modal
  filterOverlay: { flex: 1, backgroundColor: 'rgba(10,24,48,0.55)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
    maxHeight: '82%',
  },
  filterSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0DFF0', alignSelf: 'center', marginBottom: 18 },
  filterSheetTitle: { color: '#12304F', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  filterSectionLabel: {
    color: '#4A6785', fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 10, borderWidth: 1, borderColor: '#D4E1F2',
    backgroundColor: '#F7FBFF', paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: '#1D5FA8', borderColor: '#1D5FA8' },
  chipText: { color: '#2A4F79', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  filterResetBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: '#D4E1F2',
    paddingVertical: 13, alignItems: 'center',
  },
  filterResetBtnText: { color: '#4A6785', fontSize: 14, fontWeight: '700' },
  filterApplyBtn: { flex: 2, borderRadius: 14, backgroundColor: '#2F80ED', paddingVertical: 13, alignItems: 'center' },
  filterApplyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Results row
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  resetBtn: { backgroundColor: '#E8F0FC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#C6D9F5' },
  resetBtnText: { color: '#2F80ED', fontSize: 12, fontWeight: '700' },

  // Card list
  listWrap: { gap: 20 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: '#DCE8F5',
    shadowColor: '#0A2440', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09, shadowRadius: 20, elevation: 4,
  },

  // Card image area
  imageWrap: { position: 'relative' },
  typeBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(18,48,79,0.84)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  typeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  cardDots: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  cardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },

  // Card content
  propertyContent: { paddingHorizontal: 16, paddingTop: 14, gap: 4 },
  propertyTitle: { color: '#1F2937', fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
  propertyMeta: { color: '#6B7280', fontSize: 13 },
  propertyPrice: { color: '#2F80ED', fontSize: 17, fontWeight: '700', marginTop: 2 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#F4F8FD', borderRadius: 12,
    borderWidth: 1, borderColor: '#DAE8F6',
    paddingVertical: 10, paddingHorizontal: 6,
  },
  statPill: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 16, backgroundColor: '#C8D9EF' },
  statText: { color: '#24527D', fontSize: 13, fontWeight: '600' },

  // Highlights
  highlightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 16, marginTop: 10 },
  highlightBadge: { backgroundColor: '#EAF3FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#C3DAFB' },
  highlightText: { color: '#2F80ED', fontSize: 11, fontWeight: '600' },

  // CTA row in card
  contactRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, marginTop: 4 },
  contactButtonPrimary: {
    backgroundColor: '#2F80ED', borderRadius: 12, minHeight: 46,
    alignItems: 'center', justifyContent: 'center',
  },
  contactButtonPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Skeleton
  skeletonContactRow: { marginHorizontal: 16, marginTop: 12, marginBottom: 14, flexDirection: 'row', gap: 10 },

  // Empty state
  emptyState: {
    backgroundColor: '#FFFFFF', borderRadius: 22,
    borderWidth: 1, borderColor: '#DCE8F5',
    paddingVertical: 52, paddingHorizontal: 32,
    alignItems: 'center', gap: 10,
    shadowColor: '#0A2440', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  emptyIcon: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyResetBtn: { marginTop: 8, backgroundColor: '#2F80ED', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyResetBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
