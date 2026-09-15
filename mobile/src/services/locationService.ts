import * as Location from 'expo-location';
import { SocketService } from './socket';

let locationSubscription: Location.LocationSubscription | null = null;
let lastSentTime = 0;
const THROTTLE_INTERVAL_MS = 6000; // Throttle: 6 segundos para economizar dados e bateria

export const LocationService = {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrentLocation() {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
  },

  // Iniciar telemetria periódica do motorista com throttle
  async startDriverTracking(categoria: string = 'economico') {
    const granted = await this.requestPermissions();
    if (!granted) return;

    const socket = await SocketService.connect();

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      },
      (loc) => {
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
  },

  stopDriverTracking() {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
  }
};
