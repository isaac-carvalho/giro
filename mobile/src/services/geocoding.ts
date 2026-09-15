import axios from 'axios';
import { LocationPoint } from '../types';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Caixa delimitadora de Angola — evita resultados de outros países na busca.
const ANGOLA_VIEWBOX = '11.6,-4.3,24.1,-18.1';

const client = axios.create({
  timeout: 12000,
  headers: { 'User-Agent': 'GiroAngola/1.0 (suporte@giro.ao)' }
});

export const GeocodingService = {
  async search(query: string): Promise<LocationPoint[]> {
    if (query.trim().length < 3) return [];

    const res = await client.get(`${NOMINATIM}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 6,
        countrycodes: 'ao',
        viewbox: ANGOLA_VIEWBOX,
        bounded: 1,
        'accept-language': 'pt'
      }
    });

    return res.data.map((r: any) => ({
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      name: r.display_name.split(',')[0],
      address: r.display_name
    }));
  },

  async reverse(latitude: number, longitude: number): Promise<string> {
    try {
      const res = await client.get(`${NOMINATIM}/reverse`, {
        params: { lat: latitude, lon: longitude, format: 'json', 'accept-language': 'pt' }
      });
      const a = res.data.address || {};
      return [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.municipality]
        .filter(Boolean).join(', ') || 'Localização actual';
    } catch {
      return 'Localização actual';
    }
  }
};

// Haversine — distância em km entre dois pontos.
export const distanceKm = (a: LocationPoint, b: LocationPoint) => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Trânsito de Luanda: ~22 km/h de média, mais 2 min de folga.
export const estimateDurationMin = (km: number) => Math.max(5, Math.round((km / 22) * 60) + 2);

// A rota real é sempre mais longa que a linha recta.
export const roadDistanceKm = (km: number) => Math.round(km * 1.35 * 10) / 10;
