import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export const CentralDispatchScreen = () => {
  const [alerts, setAlerts] = useState([
    { id: '1', driver: 'Carlos Silveira', car: 'Toyota Vitz', loc: 'Av. 21 de Janeiro (Rocha Pinto)', status: 'ativo' }
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Central Tática 24h — GIRO</Text>
      <Text style={styles.subtitle}>Radar de Luanda & Monitoramento de Pânico</Text>

      <FlatList
        data={alerts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>🚨 SOS: {item.driver} ({item.car})</Text>
            <Text style={styles.alertLoc}>📍 {item.loc}</Text>
            
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnPNA}>
                <Text style={styles.btnText}>Acionar 7ª Esquadra PNA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSolidarity}>
                <Text style={styles.btnText}>Alerta Solidário 5km</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
    paddingTop: 50
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900'
  },
  subtitle: {
    color: '#8d968a',
    fontSize: 12,
    marginBottom: 16
  },
  alertCard: {
    backgroundColor: '#1c1214',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ff2d55',
    marginBottom: 12
  },
  alertTitle: {
    color: '#ff2d55',
    fontSize: 15,
    fontWeight: '800'
  },
  alertLoc: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  btnPNA: {
    flex: 1,
    backgroundColor: '#ff2d55',
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 6,
    alignItems: 'center'
  },
  btnSolidarity: {
    flex: 1,
    backgroundColor: '#262626',
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: 'center'
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  }
});
