import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Alert,
  ScrollView, FlatList, TextInput, Modal, ActivityIndicator
} from 'react-native';
import { LocationService } from '../services/locationService';
import { SOSButton } from '../components/SOSButton';
import { apiClient, describeApiError } from '../services/api';
import { SocketService } from '../services/socket';
import { theme, kz } from '../theme';

interface PedidoRecebido {
  corridaId: string;
  origemNome: string;
  destinoNome: string;
  distanciaKm: number;
  valorEstimado: number;
  categoria: string;
  metodoPagamento: string;
}

const META_DIARIA = 30000;

export const DriverHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoRecebido[]>([]);
  const [corrida, setCorrida] = useState<any>(null);
  const [carteira, setCarteira] = useState({ faturamento_hoje: 0, comissao_acumulada_a_pagar: 0 });
  const [pin, setPin] = useState('');
  const [pinVisivel, setPinVisivel] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [posicao, setPosicao] = useState({ lat: -8.8383, lng: 13.2344 });

  const carregarEstado = useCallback(async () => {
    try {
      const [perfil, activa] = await Promise.all([
        apiClient.get('/auth/me'),
        apiClient.get('/corridas/activa')
      ]);
      setCarteira({
        faturamento_hoje: Number(perfil.data.faturamento_hoje || 0),
        comissao_acumulada_a_pagar: Number(perfil.data.comissao_acumulada_a_pagar || 0)
      });
      if (activa.data.corrida) setCorrida(activa.data.corrida);
    } catch {
      // ecrã continua utilizável offline; os valores actualizam na próxima ligação
    }
  }, []);

  useEffect(() => { carregarEstado(); }, [carregarEstado]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const socket = await SocketService.connect();
      if (!vivo) return;

      socket.on('ride:new_request', (p: PedidoRecebido) => {
        setPedidos((atual) => atual.some(x => x.corridaId === p.corridaId) ? atual : [p, ...atual].slice(0, 8));
      });
      socket.on('ride:request_taken', ({ corridaId }: any) => {
        setPedidos((atual) => atual.filter(x => x.corridaId !== corridaId));
      });
      socket.on('corrida:cancelada', () => {
        Alert.alert('Corrida cancelada', 'O passageiro cancelou a viagem.');
        setCorrida(null);
      });
      socket.on('sos:solidarity_alert', (a: any) => {
        Alert.alert(
          '🚨 Alerta Solidário GIRO',
          `${a.driverName} accionou o pânico a menos de 5 km de si.\n${a.enderecoAproximado || ''}`
        );
      });
    })();

    return () => {
      vivo = false;
      const s = SocketService.getSocket();
      s?.off('ride:new_request');
      s?.off('ride:request_taken');
      s?.off('corrida:cancelada');
      s?.off('sos:solidarity_alert');
    };
  }, []);

  const toggleOnline = async (valor: boolean) => {
    if (valor) {
      const ok = await LocationService.startDriverTracking('economico', (loc) => {
        setPosicao({ lat: loc.latitude, lng: loc.longitude });
      });
      if (!ok) {
        Alert.alert(
          'Localização necessária',
          'Para receber corridas, a GIRO precisa da sua localização. Active a permissão nas definições do telemóvel.'
        );
        return;
      }
      setIsOnline(true);
    } else {
      LocationService.stopDriverTracking();
      setPedidos([]);
      setIsOnline(false);
    }
  };

  const aceitar = async (p: PedidoRecebido) => {
    setOcupado(true);
    try {
      const res = await apiClient.post('/corridas/aceitar', { corridaId: p.corridaId });
      setCorrida(res.data.corrida);
      setPedidos([]);
    } catch (e) {
      Alert.alert('Não foi possível aceitar', describeApiError(e, 'Tente o próximo pedido.'));
      setPedidos((atual) => atual.filter(x => x.corridaId !== p.corridaId));
    } finally {
      setOcupado(false);
    }
  };

  const iniciarViagem = async () => {
    setOcupado(true);
    try {
      await apiClient.post('/corridas/iniciar', { corridaId: corrida.id, codigoEmbarque: pin });
      setCorrida({ ...corrida, status: 'em_viagem' });
      setPinVisivel(false);
      setPin('');
    } catch (e) {
      Alert.alert('Código inválido', describeApiError(e, 'Confirme o código com o passageiro.'));
    } finally {
      setOcupado(false);
    }
  };

  const concluir = async () => {
    setOcupado(true);
    try {
      await apiClient.post('/corridas/concluir', {
        corridaId: corrida.id,
        idempotencyKey: `concluir-${corrida.id}`,
        valorFinal: Number(corrida.valor_estimado)
      });
      Alert.alert('Viagem concluída', `Ganhou ${kz(Number(corrida.valor_estimado) * 0.9)} nesta corrida.`);
      setCorrida(null);
      carregarEstado();
    } catch (e) {
      Alert.alert('Erro', describeApiError(e, 'Não foi possível concluir a viagem.'));
    } finally {
      setOcupado(false);
    }
  };

  const falta = Math.max(0, META_DIARIA - carteira.faturamento_hoje);
  const progresso = Math.min(100, (carteira.faturamento_hoje / META_DIARIA) * 100);

  return (
    <View style={styles.container}>
      <SOSButton lat={posicao.lat} lng={posicao.lng} corridaId={corrida?.id} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Painel do Motorista</Text>
            <Text style={[styles.statusPill, isOnline ? styles.pillOn : styles.pillOff]}>
              {isOnline ? 'ONLINE · a receber corridas' : 'OFFLINE'}
            </Text>
          </View>
          <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false: '#333', true: theme.green }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>FACTURAÇÃO DE HOJE</Text>
          <Text style={styles.amount}>{kz(carteira.faturamento_hoje)}</Text>

          <Text style={styles.progressLabel}>
            {falta > 0
              ? `Desafio 30K: faltam ${kz(falta)} para ganhar +1.500 Kz de bónus`
              : 'Desafio 30K concluído! Bónus de 1.500 Kz garantido.'}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progresso}%` }]} />
          </View>

          {carteira.comissao_acumulada_a_pagar > 0 && (
            <Text style={styles.comissao}>
              Comissão GIRO a liquidar: {kz(carteira.comissao_acumulada_a_pagar)} (10%)
            </Text>
          )}
        </View>

        {corrida ? (
          <View style={styles.rideCard}>
            <Text style={styles.rideTitle}>
              {corrida.status === 'em_viagem' ? 'Viagem em curso' : 'A caminho do passageiro'}
            </Text>
            <Text style={styles.rideLeg}>Recolha: {corrida.origem_nome}</Text>
            <Text style={styles.rideLeg}>Destino: {corrida.destino_nome}</Text>
            <Text style={styles.rideValue}>{kz(Number(corrida.valor_estimado))}</Text>

            {corrida.status === 'em_viagem' ? (
              <TouchableOpacity style={styles.btnPrimary} onPress={concluir} disabled={ocupado}>
                <Text style={styles.btnPrimaryText}>Concluir viagem</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setPinVisivel(true)}>
                <Text style={styles.btnPrimaryText}>Passageiro embarcou · inserir código</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {isOnline ? `Pedidos disponíveis (${pedidos.length})` : 'Fique online para receber pedidos'}
            </Text>

            {isOnline && pedidos.length === 0 && (
              <View style={styles.emptyBox}>
                <ActivityIndicator color={theme.gold} />
                <Text style={styles.emptyText}>À espera de pedidos na sua zona…</Text>
              </View>
            )}

            <FlatList
              scrollEnabled={false}
              data={pedidos}
              keyExtractor={(p) => p.corridaId}
              renderItem={({ item }) => (
                <View style={styles.pedidoCard}>
                  <View style={styles.pedidoTop}>
                    <Text style={styles.pedidoValor}>{kz(item.valorEstimado)}</Text>
                    <Text style={styles.pedidoMeta}>{item.distanciaKm} km · {item.metodoPagamento}</Text>
                  </View>
                  <Text style={styles.pedidoLeg}>De: {item.origemNome}</Text>
                  <Text style={styles.pedidoLeg}>Para: {item.destinoNome}</Text>
                  <TouchableOpacity style={styles.btnAceitar} onPress={() => aceitar(item)} disabled={ocupado}>
                    <Text style={styles.btnAceitarText}>Aceitar corrida</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        )}

        <View style={styles.chainCard}>
          <Text style={styles.chainTitle}>Pedidos em Cadeia</Text>
          <Text style={styles.chainDesc}>
            A GIRO liga a sua próxima corrida antes de terminar a actual, para não ficar parado.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={pinVisivel} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Código de embarque</Text>
            <Text style={styles.modalDesc}>Peça ao passageiro os 4 dígitos que aparecem no ecrã dele.</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="#444"
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={iniciarViagem} disabled={pin.length !== 4 || ocupado}>
              <Text style={styles.btnPrimaryText}>Iniciar viagem</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPinVisivel(false)} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: theme.text, fontSize: 20, fontWeight: '900' },
  statusPill: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  pillOn: { color: theme.green },
  pillOff: { color: theme.muted },
  card: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: theme.border, marginBottom: 18
  },
  label: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  amount: { color: theme.gold, fontSize: 30, fontWeight: '900', marginTop: 4 },
  progressLabel: { color: theme.green, fontSize: 11, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  progressBar: { height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.green },
  comissao: { color: theme.muted, fontSize: 11, marginTop: 12 },
  sectionTitle: { color: theme.gold, fontSize: 13, fontWeight: '800', marginBottom: 10 },
  emptyBox: {
    alignItems: 'center', paddingVertical: 26, backgroundColor: theme.surface,
    borderRadius: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 16
  },
  emptyText: { color: theme.muted, fontSize: 12, marginTop: 10 },
  pedidoCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: theme.gold, marginBottom: 12
  },
  pedidoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pedidoValor: { color: theme.gold, fontSize: 22, fontWeight: '900' },
  pedidoMeta: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  pedidoLeg: { color: theme.text, fontSize: 12, marginTop: 6 },
  btnAceitar: {
    backgroundColor: theme.green, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 14
  },
  btnAceitarText: { color: '#04120a', fontWeight: '900', fontSize: 14 },
  rideCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: theme.teal, marginBottom: 18
  },
  rideTitle: { color: theme.teal, fontSize: 15, fontWeight: '900' },
  rideLeg: { color: theme.text, fontSize: 12, marginTop: 6 },
  rideValue: { color: theme.gold, fontSize: 22, fontWeight: '900', marginTop: 10 },
  btnPrimary: {
    backgroundColor: theme.gold, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 16
  },
  btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 14 },
  chainCard: {
    backgroundColor: theme.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: theme.teal, marginTop: 8
  },
  chainTitle: { color: theme.teal, fontSize: 13, fontWeight: '800' },
  chainDesc: { color: theme.muted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center',
    alignItems: 'center', padding: 22
  },
  modalCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 22, width: '100%',
    borderWidth: 1, borderColor: theme.border
  },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalDesc: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  pinInput: {
    backgroundColor: theme.surfaceAlt, color: theme.gold, fontSize: 32, fontWeight: '900',
    textAlign: 'center', letterSpacing: 14, borderRadius: 12, paddingVertical: 14, marginTop: 18
  },
  btnCancel: { paddingVertical: 12, alignItems: 'center' },
  btnCancelText: { color: theme.muted, fontSize: 13, fontWeight: '600' }
});
