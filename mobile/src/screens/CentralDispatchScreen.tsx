import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { SocketService } from '../services/socket';
import { theme } from '../theme';

interface AlertaSOS {
  sosId: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  lat: number;
  lng: number;
  enderecoAproximado?: string;
  timestamp?: string;
}

export const CentralDispatchScreen = () => {
  const [alertas, setAlertas] = useState<AlertaSOS[]>([]);
  const [motoristasOnline, setMotoristasOnline] = useState(0);

  useEffect(() => {
    let vivo = true;
    const activos = new Set<string>();

    (async () => {
      const socket = await SocketService.connect();
      if (!vivo) return;

      socket.on('central:sos_incoming', (a: AlertaSOS) => {
        setAlertas((atual) => [a, ...atual.filter(x => x.sosId !== a.sosId)]);
      });
      socket.on('central:driver_moved', ({ driverId }: any) => {
        activos.add(driverId);
        setMotoristasOnline(activos.size);
      });
      socket.on('central:driver_offline', ({ driverId }: any) => {
        activos.delete(driverId);
        setMotoristasOnline(activos.size);
      });
    })();

    return () => {
      vivo = false;
      const s = SocketService.getSocket();
      s?.off('central:sos_incoming');
      s?.off('central:driver_moved');
      s?.off('central:driver_offline');
    };
  }, []);

  const abrirNoMapa = (a: AlertaSOS) => {
    Linking.openURL(`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}`);
  };

  const ligarMotorista = (a: AlertaSOS) => {
    if (a.driverPhone) Linking.openURL(`tel:${a.driverPhone}`);
    else Alert.alert('Sem contacto', 'Este alerta não trouxe número de telefone.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Central Táctica 24h</Text>
      <Text style={styles.subtitle}>
        {motoristasOnline} motorista(s) online · {alertas.length} alerta(s) activo(s)
      </Text>

      <FlatList
        data={alertas}
        keyExtractor={(item) => item.sosId}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sem alertas activos</Text>
            <Text style={styles.emptyDesc}>O radar está a monitorizar a frota em tempo real.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>SOS · {item.driverName}</Text>
            <Text style={styles.alertLoc}>
              {item.enderecoAproximado || `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`}
            </Text>
            {item.timestamp && (
              <Text style={styles.alertTime}>{new Date(item.timestamp).toLocaleTimeString('pt-PT')}</Text>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => ligarMotorista(item)}>
                <Text style={styles.btnText}>Ligar ao motorista</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => abrirNoMapa(item)}>
                <Text style={styles.btnText}>Ver no mapa</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnResolver}
              onPress={() => setAlertas((a) => a.filter(x => x.sosId !== item.sosId))}
            >
              <Text style={styles.btnResolverText}>Marcar como resolvido</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16, paddingTop: 56 },
  title: { color: theme.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: theme.muted, fontSize: 12, marginBottom: 18, marginTop: 4 },
  emptyBox: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 26, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border
  },
  emptyTitle: { color: theme.green, fontSize: 14, fontWeight: '800' },
  emptyDesc: { color: theme.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  alertCard: {
    backgroundColor: '#1c1214', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: theme.danger, marginBottom: 12
  },
  alertTitle: { color: theme.danger, fontSize: 15, fontWeight: '900' },
  alertLoc: { color: theme.text, fontSize: 12, marginTop: 6 },
  alertTime: { color: theme.muted, fontSize: 11, marginTop: 2 },
  btnRow: { flexDirection: 'row', marginTop: 14 },
  btnPrimary: {
    flex: 1, backgroundColor: theme.danger, paddingVertical: 12,
    borderRadius: 10, marginRight: 6, alignItems: 'center'
  },
  btnSecondary: {
    flex: 1, backgroundColor: theme.border, paddingVertical: 12,
    borderRadius: 10, marginLeft: 6, alignItems: 'center'
  },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  btnResolver: { paddingVertical: 12, alignItems: 'center' },
  btnResolverText: { color: theme.muted, fontSize: 12, fontWeight: '700' }
});
