import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 24,
    gap: 20,
    paddingBottom: 44,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: '#1A365D',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#35557F',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  profileChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6E0ED',
    backgroundColor: '#FFFFFF',
  },
  profileChipText: {
    color: '#1A365D',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#1A365D',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0D2138',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 3,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 24,
  },
  floatingTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#1A365D',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  floatingTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroContent: {
    marginTop: 18,
    gap: 6,
  },
  heroTitle: {
    color: '#102A46',
    fontSize: 22,
    fontWeight: '700',
  },
  heroMeta: {
    color: '#466A92',
    fontSize: 14,
    fontWeight: '400',
  },
  heroPrice: {
    color: '#2B6CB0',
    fontSize: 17,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE6F2',
    shadowColor: '#0F2640',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    gap: 8,
  },
  actionTitle: {
    color: '#1A365D',
    fontSize: 16,
    fontWeight: '700',
  },
  actionText: {
    color: '#4E6F96',
    fontSize: 13,
    lineHeight: 20,
  },
  cta: {
    marginTop: 4,
  },
});
