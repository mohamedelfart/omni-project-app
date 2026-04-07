import { StyleSheet } from 'react-native';

export const propertyDetailsStyles = StyleSheet.create({
  page: {
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#10233A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  heroImageWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 230,
  },
  priceTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#1A365D',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  priceTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#1A365D',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  location: {
    color: '#4A6B92',
    fontSize: 14,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7E3F0',
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    gap: 4,
  },
  statLabel: {
    color: '#4E6E95',
    fontSize: 12,
  },
  statValue: {
    color: '#163252',
    fontSize: 14,
    fontWeight: '700',
  },
  bodyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#10233A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    gap: 12,
  },
  sectionTitle: {
    color: '#1A365D',
    fontSize: 18,
    fontWeight: '700',
  },
  bodyText: {
    color: '#55779E',
    fontSize: 14,
    lineHeight: 22,
  },
  actionRow: {
    gap: 10,
    marginTop: 6,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
});
