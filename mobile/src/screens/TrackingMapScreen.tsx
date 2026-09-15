import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { SOSButton } from '../components/SOSButton';

export const TrackingMapScreen = () => {
  const [driverPos, setDriverPos] = useState({
    latitude: -8.8383,
    longitude: 13.2344
  });

  return (
    <View style={styles.container}>
      {/* Mapa OSM / Mapbox de Baixo Consumo */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -8.8383,
          longitude: 13.2344,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {/* Renderização de tiles OpenStreetMap offline-cached */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        <Marker coordinate={driverPos} title="Seu Motorista GIRO" />
      </MapView>

      {/* Botão de Pânico com Raio de 5 KM */}
      <SOSButton lat={driverPos.latitude} lng={driverPos.longitude} />

      {/* Card Inferior de Viagem */}
      <View style={styles.bottomCard}>
        <Text style={styles.driverName}>Mateus Kapapelo (Hyundai i10)</Text>
        <Text style={styles.tripStatus}>A caminho · Chegada em 4 min</Text>
        <View style={styles.pinBadge}>
          <Text style={styles.pinLabel}>CÓDIGO DE EMBARQUE:</Text>
          <Text style={styles.pinCode}>4821</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  map: {
    flex: 1
  },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626'
  },
  driverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  tripStatus: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  pinBadge: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pinLabel: {
    color: '#8d968a',
    fontSize: 11,
    fontWeight: '700'
  },
  pinCode: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: '900'
  }
});
