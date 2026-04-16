import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { apiRequest, getApiAuthToken } from '../../lib/api-client';

type TenantRequest = {
  id: string;
  tenantId: string;
  vendorId?: string;
  type: 'cleaning' | 'moving' | 'maintenance';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  propertyIds?: string[];
  primaryPropertyId?: string;
};

export function MyRequestsScreen() {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<TenantRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketBaseUrl = useMemo(() => (
    (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '')
  ), []);

  const loadRequests = async () => {
    try {
      const result = await apiRequest<TenantRequest[]>('/unified-requests/realtime/me', { method: 'GET' });
      setRequests(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const createRequest = async (type: TenantRequest['type']) => {
    try {
      const result = await apiRequest<TenantRequest>('/unified-requests/realtime', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      setRequests((current) => [result, ...current]);
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create request');
    }
  };

  useEffect(() => {
    void loadRequests();
    const socket = io(`${socketBaseUrl}/requests`, {
      transports: ['websocket'],
      auth: { token: getApiAuthToken() ?? '' },
    });
    socket.on('request.created', () => void loadRequests());
    socket.on('request.assigned', () => void loadRequests());
    socket.on('request.updated', () => void loadRequests());
    return () => socket.disconnect();
  }, [socketBaseUrl]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>{'←'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>My Requests</Text>
          <Text style={styles.subTitle}>Create and track rental service requests</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => void createRequest('cleaning')}>
          <Text style={styles.actionButtonText}>Create Cleaning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => void createRequest('moving')}>
          <Text style={styles.actionButtonText}>Create Moving</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => void createRequest('maintenance')}>
          <Text style={styles.actionButtonText}>Create Maintenance</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No requests yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {requests.map((request) => (
            <View key={request.id} style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{request.id}</Text>
                <Text style={styles.cardMeta}>type: {request.type}</Text>
                <Text style={styles.cardMeta}>tenant: {request.tenantId}</Text>
                <Text style={styles.cardMeta}>vendor: {request.vendorId ?? 'unassigned'}</Text>
                <View style={styles.statusChip}>
                  <Text style={styles.statusText}>{request.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FD' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBF5',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F6FF',
    borderWidth: 1,
    borderColor: '#D8E5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#2B4F7D', fontSize: 16, fontWeight: '700' },
  title: { color: '#152C49', fontSize: 17, fontWeight: '700' },
  subTitle: { color: '#6E839C', fontSize: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginTop: 10 },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#255B9C',
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorText: { color: '#B42318', paddingHorizontal: 14, marginTop: 8 },
  content: { padding: 14, gap: 10 },
  emptyWrap: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE8F4',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  emptyText: { marginTop: 12, color: '#6B819D', fontSize: 13 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE8F4',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 10,
    flexDirection: 'row',
  },
  cardTitle: { color: '#172E4C', fontSize: 14, fontWeight: '700' },
  cardMeta: { color: '#6C819B', fontSize: 12 },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#CAE0FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: { color: '#255B9C', fontSize: 11, fontWeight: '700' },
});
