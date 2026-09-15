import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VehicleCategory } from '../types';

interface Props {
  category: VehicleCategory;
  name: string;
  desc: string;
  priceKz: number;
  isSelected: boolean;
  etaMin: number;
  onSelect: () => void;
}

export const FareEstimateCard: React.FC<Props> = ({
  name,
  desc,
  priceKz,
  isSelected,
  etaMin,
  onSelect
}) => {
  return (
    <TouchableOpacity 
      style={[styles.card, isSelected && styles.selectedCard]} 
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.desc}>{desc} · Chegada em {etaMin} min</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{priceKz.toLocaleString('pt-PT')} Kz</Text>
        <Text style={styles.savingBadge}>-12% Menor Tarifa</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#262626'
  },
  selectedCard: {
    borderColor: '#d4af37',
    backgroundColor: '#1f1a10'
  },
  left: {
    flex: 1
  },
  name: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  desc: {
    color: '#8d968a',
    fontSize: 12,
    marginTop: 2
  },
  right: {
    alignItems: 'flex-end'
  },
  price: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '800'
  },
  savingBadge: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2
  }
});
