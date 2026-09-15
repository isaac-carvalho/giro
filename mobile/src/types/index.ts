/**
 * DEFINIÇÕES DE TIPOS TYPESCRIPT — GIRO ANGOLA
 */

export type UserType = 'passageiro' | 'motorista' | 'central_operador' | 'admin';

export type VehicleCategory = 
  | 'moto' 
  | 'economico' 
  | 'conforto' 
  | 'giro_7' 
  | 'entrega_moto' 
  | 'entrega_carro' 
  | 'entrega_van' 
  | 'carga_pickup' 
  | 'carga_canter' 
  | 'carga_pesada';

export type PaymentMethod = 'DINHEIRO' | 'MULTICAIXA_EXPRESS' | 'UNITEL_MONEY';

export type RideStatus = 
  | 'solicitada' 
  | 'aceita' 
  | 'motorista_a_caminho' 
  | 'motorista_no_local' 
  | 'em_viagem' 
  | 'concluida' 
  | 'cancelada';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface FareEstimate {
  category: VehicleCategory;
  categoryName: string;
  totalKz: number;
  durationMin: number;
  distanceKm: number;
  discountApplied?: number;
}

export interface RideRequest {
  idempotencyKey: string;
  origemNome: string;
  origemLat: number;
  origemLng: number;
  destinoNome: string;
  destinoLat: number;
  destinoLng: number;
  distanciaKm: number;
  duracaoMin: number;
  categoria: VehicleCategory;
  metodoPagamento: PaymentMethod;
}

export interface SOSAlert {
  sosId?: string;
  lat: number;
  lng: number;
  corridaId?: string;
  enderecoAproximado?: string;
  timestamp?: string;
}
