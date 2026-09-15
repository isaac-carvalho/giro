import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api';

const QUEUE_KEY = 'giro_offline_request_queue';

export const OfflineQueueService = {
  // Enfileirar requisição quando não há rede
  async enqueue(endpoint: string, payload: any): Promise<void> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({
      id: Date.now().toString(),
      endpoint,
      payload,
      timestamp: Date.now()
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Processar fila quando reconectar
  async processQueue(): Promise<void> {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;

    const queue = JSON.parse(raw);
    if (queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      try {
        await apiClient.post(item.endpoint, item.payload);
      } catch (err) {
        remaining.push(item);
      }
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }
};

// Monitoramento ativo de conectividade
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    OfflineQueueService.processQueue();
  }
});
