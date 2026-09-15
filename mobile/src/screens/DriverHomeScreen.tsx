import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { LocationService } from '../services/locationService';
import { SOSButton } from '../components/SOSButton';

export const DriverHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [earningsToday, setEarningsToday] = useState(18500);

  const toggleOnline = async (value: boolean) => {
    setIsOnline(value);
    if (value) {
      await LocationService.startDriverTracking('economico');
      Alert.alert('🟢 ONLINE', 'Você está visível no radar da GIRO. Apenas 10% de comissão!');
    } else {
      LocationService.stopDriverTracking();
      Alert.alert('⚪ OFFLINE', 'Radar desligado.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel do Motorista</Text>
        <Switch 
          value={isOnline} 
          onValueChange={toggleOnline} 
          trackColor={{ false: '#333', true: '#22c55e' }}
        />
      </View>

      {/* Cartão de Faturamento & Desafio 30K */}
      <View style={styles.card}>
        <Text style={styles.label}>FATURAMENTO DE HOJE</Text>
        <Text style={styles.amount}>{earningsToday.toLocaleString('pt-PT')} Kz</Text>

        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>
            Desafio 30K: Faltam {(30000 - earningsToday).toLocaleString('pt-PT')} Kz para +1.500 Kz de bônus!
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(earningsToday / 30000) * 100}%` }]} />
          </View>
        </View>
      </View>

      {/* Botão de Pânico com Alerta Solidário 5km */}
      <SOSButton lat={-8.8383} lng={13.2344} />

      {/* Pedidos em Cadeia: Notificação de Próxima Corrida */}
      <View style={styles.chainCard}>
        <Text style={styles.chainTitle}>🔗 Pedidos em Cadeia Ativos</Text>
        <Text style={styles.chainDesc}>
          O sistema conectará a sua próxima corrida antes de terminar a viagem atual.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
    paddingTop: 50
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900'
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16
  },
  label: {
    color: '#8d968a',
    fontSize: 11,
    fontWeight: '700'
  },
  amount: {
    color: '#d4af37',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4
  },
  progressWrap: {
    marginTop: 14
  },
  progressLabel: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6
  },
  progressBar: {
    height: 8,
    backgroundColor: '#262626',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e'
  },
  chainCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2ec4b6'
  },
  chainTitle: {
    color: '#2ec4b6',
    fontSize: 14,
    fontWeight: '800'
  },
  chainDesc: {
    color: '#8d968a',
    fontSize: 12,
    marginTop: 4
  }
});
