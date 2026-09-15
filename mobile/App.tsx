import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { RideRequestScreen } from './src/screens/RideRequestScreen';
import { DriverHomeScreen } from './src/screens/DriverHomeScreen';
import { CentralDispatchScreen } from './src/screens/CentralDispatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { theme } from './src/theme';

type Aba = 'inicio' | 'perfil';

const Shell = () => {
  const { user, restoring } = useAuth();
  const [mostrarRegisto, setMostrarRegisto] = useState(false);
  const [aba, setAba] = useState<Aba>('inicio');

  if (restoring) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>GIRO</Text>
        <ActivityIndicator color={theme.gold} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!user) {
    return mostrarRegisto
      ? <RegisterScreen onBack={() => setMostrarRegisto(false)} />
      : <LoginScreen onGoToRegister={() => setMostrarRegisto(true)} />;
  }

  const Inicio = user.tipo === 'motorista'
    ? DriverHomeScreen
    : (user.tipo === 'central_operador' || user.tipo === 'admin')
      ? CentralDispatchScreen
      : RideRequestScreen;

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {aba === 'inicio' ? <Inicio /> : <ProfileScreen />}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        <TabButton
          label={user.tipo === 'motorista' ? 'Conduzir' : user.tipo === 'passageiro' ? 'Viajar' : 'Central'}
          activo={aba === 'inicio'}
          onPress={() => setAba('inicio')}
        />
        <TabButton label="Conta" activo={aba === 'perfil'} onPress={() => setAba('perfil')} />
      </SafeAreaView>
    </View>
  );
};

const TabButton: React.FC<{ label: string; activo: boolean; onPress: () => void }> = ({ label, activo, onPress }) => (
  <TouchableOpacity style={styles.tab} onPress={onPress}>
    <View style={[styles.tabDot, activo && styles.tabDotActive]} />
    <Text style={[styles.tabText, activo && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  splash: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' },
  splashLogo: { color: theme.gold, fontSize: 48, fontWeight: '900', letterSpacing: 6 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.border, marginBottom: 5 },
  tabDotActive: { backgroundColor: theme.gold },
  tabText: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: theme.gold }
});
