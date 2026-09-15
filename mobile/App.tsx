import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RideRequestScreen } from './src/screens/RideRequestScreen';
import { DriverHomeScreen } from './src/screens/DriverHomeScreen';
import { CentralDispatchScreen } from './src/screens/CentralDispatchScreen';

export default function App() {
  const [role, setRole] = useState<'pax' | 'driver' | 'central'>('pax');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Seletor Rápido de Perfil */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.tab, role === 'pax' && styles.tabActive]}
          onPress={() => setRole('pax')}
        >
          <Text style={[styles.tabText, role === 'pax' && styles.tabTextActive]}>Passageiro</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, role === 'driver' && styles.tabActive]}
          onPress={() => setRole('driver')}
        >
          <Text style={[styles.tabText, role === 'driver' && styles.tabTextActive]}>Motorista (10%)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, role === 'central' && styles.tabActive]}
          onPress={() => setRole('central')}
        >
          <Text style={[styles.tabText, role === 'central' && styles.tabTextActive]}>Central 24h</Text>
        </TouchableOpacity>
      </View>

      {/* Renderização de Telas */}
      <View style={styles.content}>
        {role === 'pax' && <RideRequestScreen />}
        {role === 'driver' && <DriverHomeScreen />}
        {role === 'central' && <CentralDispatchScreen />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    padding: 6,
    marginHorizontal: 12,
    marginTop: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626'
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: '#d4af37'
  },
  tabText: {
    color: '#8d968a',
    fontSize: 11,
    fontWeight: '700'
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '900'
  },
  content: {
    flex: 1
  }
});
