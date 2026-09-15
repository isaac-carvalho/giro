import * as Location from 'expo-location';
import { SocketService } from './socket';

let locationSubscription: Location.LocationSubscription | null = null;
let lastSentTime = 0;
const THROTTLE_INTERVAL_MS = 6000; // 6s: poupa bateria e dados móveis

type OnPosition = (pos: { latitude: number; longitude: number }) => void;

export const LocationService = {
  async requestForeground(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  // Só pedimos localização em segundo plano depois de o motorista ficar online,
  // porque a Google exige que o pedido apareça no contexto que o justifica.
  async requestBackground(): Promise<boolean> {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrentLocation() {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  },

  async startDriverTracking(categoria: string = 'economico', onPosition?: OnPosition): Promise<boolean> {
    const granted = await this.requestForeground();
    if (!granted) return false;

    await this.requestBackground();
    const socket = await SocketService.connect();

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      },
      (loc) => {
        onPosition?.({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

        const now = Date.now();
        if (now - lastSentTime >= THROTTLE_INTERVAL_MS) {
          lastSentTime = now;
          socket.emit('driver:location_update', {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading || 0,
            speed: loc.coords.speed || 0,
            status: 'online',
            categoria
          });
        }
      }
    );

    return true;
  },

  stopDriverTracking() {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
  }
};
