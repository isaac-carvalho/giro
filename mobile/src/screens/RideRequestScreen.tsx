import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Platform
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { FareEstimateCard } from '../components/FareEstimateCard';
import { SOSButton } from '../components/SOSButton';
import { VehicleCategory, PaymentMethod, LocationPoint } from '../types';
import { apiClient, describeApiError } from '../services/api';
import { SocketService } from '../services/socket';
import { GeocodingService, distanceKm, estimateDurationMin, roadDistanceKm } from '../services/geocoding';
import { theme, kz } from '../theme';

type Fase = 'destino' | 'categoria' | 'aguardando' | 'a_caminho' | 'em_viagem';

const LUANDA: Region = {
  latitude: -8.8383,
  longitude: 13.2344,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

const CATALOGO: { cat: VehicleCategory; name: string; desc: string; lugares: number }[] = [
  { cat: 'moto', name: 'GIRO Moto', desc: 'Kupapata · rápido no trânsito', lugares: 1 },
  { cat: 'economico', name: 'GIRO Económico', desc: '4 lugares · ar condicionado', lugares: 4 },
  { cat: 'conforto', name: 'GIRO Conforto', desc: 'Viatura recente · espaço extra', lugares: 4 },
  { cat: 'giro_7', name: 'GIRO 7', desc: '7 lugares · malas ou aeroporto', lugares: 7 },
  { cat: 'carga_pickup', name: 'GIRO Pick-Up', desc: 'Até 1 tonelada · carga aberta', lugares: 2 }
];

export const RideRequestScreen = () => {
  const mapRef = useRef<MapView>(null);
  const [fase, setFase] = useState<Fase>('destino');

  const [origem, setOrigem] = useState<LocationPoint | null>(null);
  const [destino, setDestino] = useState<LocationPoint | null>(null);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<LocationPoint[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [precos, setPrecos] = useState<Record<string, number>>({});
  const [categoria, setCategoria] = useState<VehicleCategory>('economico');
  const [pagamento, setPagamento] = useState<PaymentMethod>('MULTICAIXA_EXPRESS');
  const [loading, setLoading] = useState(false);

  const [corrida, setCorrida] = useState<any>(null);
  const [motoristaPos, setMotoristaPos] = useState<LocationPoint | null>(null);

  const rota = useMemo(() => {
    if (!origem || !destino) return null;
    const km = roadDistanceKm(distanceKm(origem, destino));
    return { km, min: estimateDurationMin(km) };
  }, [origem, destino]);

  // Localização actual do passageiro
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setOrigem({ latitude: LUANDA.latitude, longitude: LUANDA.longitude, name: 'Luanda' });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nome = await GeocodingService.reverse(pos.coords.latitude, pos.coords.longitude);
      setOrigem({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, name: nome });
      mapRef.current?.animateToRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      }, 800);
    })();
  }, []);

  // Busca de endereços com atraso, para não disparar a cada tecla
  useEffect(() => {
    if (busca.trim().length < 3) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        setResultados(await GeocodingService.search(busca));
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [busca]);

  // Preços reais do servidor assim que existe rota
  useEffect(() => {
    if (fase !== 'categoria' || !rota) return;
    (async () => {
      try {
        const res = await apiClient.post('/corridas/estimativa', {
          distanciaKm: rota.km,
          duracaoMin: rota.min
        });
        const mapa: Record<string, number> = {};
        res.data.estimativas.forEach((e: any) => { mapa[e.categoria] = e.valorKz; });
        setPrecos(mapa);
      } catch (e) {
        Alert.alert('Preços indisponíveis', describeApiError(e, 'Não foi possível obter as tarifas.'));
      }
    })();
  }, [fase, rota]);

  // Acompanhamento do motorista em tempo real
  useEffect(() => {
    if (!corrida) return;
    let ativo = true;

    (async () => {
      const socket = await SocketService.connect();
      if (!ativo) return;

      socket.on('corrida:aceita', (data: any) => {
        setCorrida((c: any) => ({ ...c, ...data }));
        setFase('a_caminho');
      });
      socket.on('corrida:motorista_posicao', (data: any) => {
        setMotoristaPos({ latitude: data.lat, longitude: data.lng });
      });
      socket.on('corrida:iniciada', () => setFase('em_viagem'));
      socket.on('corrida:concluida', () => {
        Alert.alert('Viagem concluída', 'Obrigado por viajar com a GIRO.');
        reiniciar();
      });
    })();

    return () => {
      ativo = false;
      const s = SocketService.getSocket();
      s?.off('corrida:aceita');
      s?.off('corrida:motorista_posicao');
      s?.off('corrida:iniciada');
      s?.off('corrida:concluida');
    };
  }, [corrida?.id]);

  const escolherDestino = (p: LocationPoint) => {
    setDestino(p);
    setBusca('');
    setResultados([]);
    setFase('categoria');
    if (origem) {
      mapRef.current?.fitToCoordinates([origem, p], {
        edgePadding: { top: 90, right: 60, bottom: 380, left: 60 },
        animated: true
      });
    }
  };

  const confirmarCorrida = async () => {
    if (!origem || !destino || !rota) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/corridas/solicitar', {
        origemNome: origem.name || 'Ponto de recolha',
        origemLat: origem.latitude,
        origemLng: origem.longitude,
        destinoNome: destino.name || 'Destino',
        destinoLat: destino.latitude,
        destinoLng: destino.longitude,
        distanciaKm: rota.km,
        duracaoMin: rota.min,
        categoria,
        metodoPagamento: pagamento,
        idempotencyKey: Crypto.randomUUID()
      });
      setCorrida(res.data.corrida);
      setFase('aguardando');
    } catch (e) {
      Alert.alert('Erro', describeApiError(e, 'Falha ao solicitar corrida.'));
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    setCorrida(null);
    setMotoristaPos(null);
    setDestino(null);
    setPrecos({});
    setFase('destino');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={LUANDA}
        showsUserLocation
        showsMyLocationButton={false}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />

        {origem && <Marker coordinate={origem} title="Recolha" pinColor={theme.green} />}
        {destino && <Marker coordinate={destino} title="Destino" pinColor={theme.gold} />}
        {motoristaPos && <Marker coordinate={motoristaPos} title="O seu motorista" pinColor={theme.teal} />}
        {origem && destino && (
          <Polyline coordinates={[origem, destino]} strokeColor={theme.gold} strokeWidth={4} />
        )}
      </MapView>

      {(fase === 'a_caminho' || fase === 'em_viagem') && origem && (
        <SOSButton lat={origem.latitude} lng={origem.longitude} corridaId={corrida?.id} />
      )}

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {fase === 'destino' && (
          <>
            <Text style={styles.sheetTitle}>Para onde vai?</Text>
            <View style={styles.originRow}>
              <View style={styles.dotGreen} />
              <Text style={styles.originText} numberOfLines={1}>
                {origem?.name || 'A obter a sua localização…'}
              </Text>
            </View>
            <TextInput
              style={styles.searchInput}
              value={busca}
              onChangeText={setBusca}
              placeholder="Bairro, rua ou ponto de referência"
              placeholderTextColor="#555"
            />
            {buscando && <ActivityIndicator color={theme.gold} style={{ marginTop: 12 }} />}
            <FlatList
              style={styles.results}
              data={resultados}
              keyExtractor={(item, i) => `${item.latitude}-${item.longitude}-${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => escolherDestino(item)}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddr} numberOfLines={1}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {fase === 'categoria' && rota && (
          <>
            <View style={styles.routeHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{destino?.name}</Text>
              <Text style={styles.routeMeta}>{rota.km} km · {rota.min} min</Text>
            </View>

            <ScrollView style={styles.catList}>
              {CATALOGO.map((c) => (
                <FareEstimateCard
                  key={c.cat}
                  category={c.cat}
                  name={c.name}
                  desc={c.desc}
                  priceKz={precos[c.cat] ?? 0}
                  etaMin={rota.min}
                  isSelected={categoria === c.cat}
                  onSelect={() => setCategoria(c.cat)}
                />
              ))}
            </ScrollView>

            <View style={styles.payRow}>
              {(['DINHEIRO', 'MULTICAIXA_EXPRESS', 'UNITEL_MONEY'] as PaymentMethod[]).map((pm) => (
                <TouchableOpacity
                  key={pm}
                  style={[styles.payChip, pagamento === pm && styles.payChipActive]}
                  onPress={() => setPagamento(pm)}
                >
                  <Text style={[styles.payText, pagamento === pm && styles.payTextActive]}>
                    {pm === 'DINHEIRO' ? 'Dinheiro' : pm === 'MULTICAIXA_EXPRESS' ? 'Express' : 'Unitel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.btnBack} onPress={() => { setDestino(null); setFase('destino'); }}>
                <Text style={styles.btnBackText}>Mudar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, !precos[categoria] && styles.btnDisabled]}
                onPress={confirmarCorrida}
                disabled={loading || !precos[categoria]}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.btnPrimaryText}>Confirmar · {kz(precos[categoria] || 0)}</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {fase === 'aguardando' && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={theme.gold} size="large" />
            <Text style={styles.statusTitle}>A procurar motorista…</Text>
            <Text style={styles.statusDesc}>
              Preço fixo de {kz(corrida?.valor_estimado || 0)}. Não muda durante a viagem.
            </Text>
            <TouchableOpacity style={styles.btnCancel} onPress={reiniciar}>
              <Text style={styles.btnCancelText}>Cancelar pedido</Text>
            </TouchableOpacity>
          </View>
        )}

        {(fase === 'a_caminho' || fase === 'em_viagem') && (
          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>
              {fase === 'a_caminho' ? 'O motorista está a caminho' : 'Em viagem'}
            </Text>
            {corrida?.motorista_nome && (
              <Text style={styles.driverLine}>
                {corrida.motorista_nome} · {corrida.veiculo || 'Viatura GIRO'}
              </Text>
            )}
            <View style={styles.pinBadge}>
              <Text style={styles.pinLabel}>CÓDIGO DE EMBARQUE</Text>
              <Text style={styles.pinCode}>{corrida?.codigo_embarque || '----'}</Text>
            </View>
            <Text style={styles.statusDesc}>
              Só entre na viatura depois do motorista confirmar este código.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, paddingBottom: 28, maxHeight: '68%',
    borderTopWidth: 1, borderColor: theme.border
  },
  handle: {
    width: 42, height: 4, borderRadius: 2, backgroundColor: theme.border,
    alignSelf: 'center', marginBottom: 14
  },
  sheetTitle: { color: theme.text, fontSize: 19, fontWeight: '900', flex: 1 },
  originRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.green, marginRight: 10 },
  originText: { color: theme.muted, fontSize: 13, flex: 1 },
  searchInput: {
    backgroundColor: theme.surfaceAlt, color: theme.text, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15
  },
  results: { marginTop: 8 },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  resultName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  resultAddr: { color: theme.muted, fontSize: 11, marginTop: 2 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeMeta: { color: theme.gold, fontSize: 12, fontWeight: '800', marginLeft: 10 },
  catList: { marginTop: 12, maxHeight: 260 },
  payRow: { flexDirection: 'row', marginTop: 10 },
  payChip: {
    flex: 1, paddingVertical: 10, backgroundColor: theme.surfaceAlt, borderRadius: 10,
    marginHorizontal: 3, alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  payChipActive: { borderColor: theme.gold, backgroundColor: '#1f1a10' },
  payText: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  payTextActive: { color: theme.gold },
  actionRow: { flexDirection: 'row', marginTop: 14 },
  btnBack: {
    paddingHorizontal: 20, justifyContent: 'center', backgroundColor: theme.surfaceAlt,
    borderRadius: 14, marginRight: 10
  },
  btnBackText: { color: theme.muted, fontWeight: '800', fontSize: 13 },
  btnPrimary: {
    flex: 1, backgroundColor: theme.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center'
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimaryText: { color: '#000', fontSize: 15, fontWeight: '900' },
  statusBox: { alignItems: 'center', paddingVertical: 10 },
  statusTitle: { color: theme.text, fontSize: 17, fontWeight: '900', marginTop: 10 },
  statusDesc: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  driverLine: { color: theme.teal, fontSize: 13, fontWeight: '700', marginTop: 4 },
  pinBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 12,
    marginTop: 14, width: '100%'
  },
  pinLabel: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  pinCode: { color: theme.gold, fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  btnCancel: { marginTop: 18, paddingVertical: 10 },
  btnCancelText: { color: theme.danger, fontSize: 13, fontWeight: '700' }
});
