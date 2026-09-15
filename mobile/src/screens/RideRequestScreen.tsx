import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { FareEstimateCard } from '../components/FareEstimateCard';
import { VehicleCategory, PaymentMethod } from '../types';
import { apiClient } from '../services/api';
import * as Crypto from 'expo-crypto';

export const RideRequestScreen = () => {
  const [origin, setOrigin] = useState('Talatona, Rua Principal');
  const [destination, setDestination] = useState('Centralidade do Kilamba');
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('economico');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MULTICAIXA_EXPRESS');
  const [loading, setLoading] = useState(false);

  // Estimativas calculadas localmente (Fare Estimate antes de confirmar)
  const categories = [
    { cat: 'moto' as VehicleCategory, name: 'GIRO Moto (Kupapata)', desc: '1 lugar · rápido no trânsito', price: 1100, eta: 3 },
    { cat: 'economico' as VehicleCategory, name: 'GIRO Económico', desc: '4 lugares · ar condicionado', price: 2350, eta: 4 },
    { cat: 'conforto' as VehicleCategory, name: 'GIRO Conforto', desc: 'Viatura recente · espaço extra', price: 2680, eta: 6 },
    { cat: 'giro_7' as VehicleCategory, name: 'GIRO 7 (Familiar)', desc: '7 lugares · malas ou aeroporto', price: 3290, eta: 8 },
    { cat: 'carga_pickup' as VehicleCategory, name: 'GIRO Pick-Up (+50%)', desc: 'Até 1 Tonelada · carga aberta', price: 3520, eta: 10 }
  ];

  const handleConfirmRide = async () => {
    setLoading(true);
    const idempotencyKey = Crypto.randomUUID();

    try {
      const res = await apiClient.post('/corridas/solicitar', {
        origemNome: origin,
        origemLat: -8.9147,
        origemLng: 13.1893,
        destinoNome: destination,
        destinoLat: -8.9400,
        destinoLng: 13.1600,
        distanciaKm: 6.2,
        duracaoMin: 14,
        categoria: selectedCategory,
        metodoPagamento: paymentMethod,
        idempotencyKey
      });

      const { codigo_embarque, valor_estimado } = res.data.corrida;
      Alert.alert(
        '🚗 VIAGEM SOLICITADA!',
        `Código de Embarque Seguro: ${codigo_embarque}\nValor Fixo: ${valor_estimado.toLocaleString('pt-PT')} Kz\nMotoristas a caminho.`,
        [{ text: 'ACOMPANHAR NO MAPA' }]
      );
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Falha ao solicitar corrida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Pedir Viagem GIRO</Text>

      {/* Input de Origem e Destino */}
      <View style={styles.searchBox}>
        <TextInput 
          style={styles.input} 
          value={origin} 
          onChangeText={setOrigin} 
          placeholder="Ponto de Recolha" 
          placeholderTextColor="#666" 
        />
        <TextInput 
          style={[styles.input, { marginTop: 8 }]} 
          value={destination} 
          onChangeText={setDestination} 
          placeholder="Para onde vai?" 
          placeholderTextColor="#666" 
        />
      </View>

      <Text style={styles.sectionTitle}>Escolha a Categoria</Text>
      <ScrollView style={styles.list}>
        {categories.map((c) => (
          <FareEstimateCard
            key={c.cat}
            category={c.cat}
            name={c.name}
            desc={c.desc}
            priceKz={c.price}
            etaMin={c.eta}
            isSelected={selectedCategory === c.cat}
            onSelect={() => setSelectedCategory(c.cat)}
          />
        ))}
      </ScrollView>

      {/* Seletor de Pagamento */}
      <View style={styles.payRow}>
        {(['DINHEIRO', 'MULTICAIXA_EXPRESS', 'UNITEL_MONEY'] as PaymentMethod[]).map(pm => (
          <TouchableOpacity
            key={pm}
            style={[styles.payChip, paymentMethod === pm && styles.payChipActive]}
            onPress={() => setPaymentMethod(pm)}
          >
            <Text style={[styles.payText, paymentMethod === pm && styles.payTextActive]}>
              {pm === 'DINHEIRO' ? '💵 Dinheiro' : pm === 'MULTICAIXA_EXPRESS' ? '💳 Express' : '📱 Unitel'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Botão de Confirmação com Preço Fixo */}
      <TouchableOpacity 
        style={styles.btnConfirm} 
        onPress={handleConfirmRide}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.btnConfirmText}>Confirmar Corrida</Text>
        )}
      </TouchableOpacity>
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
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16
  },
  searchBox: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  sectionTitle: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8
  },
  list: {
    flex: 1
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10
  },
  payChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#161616',
    borderRadius: 10,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626'
  },
  payChipActive: {
    borderColor: '#d4af37',
    backgroundColor: '#1f1a10'
  },
  payText: {
    color: '#8d968a',
    fontSize: 11,
    fontWeight: '700'
  },
  payTextActive: {
    color: '#d4af37'
  },
  btnConfirm: {
    backgroundColor: '#d4af37',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10
  },
  btnConfirmText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900'
  }
});
