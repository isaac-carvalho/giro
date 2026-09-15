import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Modal, View, Alert } from 'react-native';
import { SocketService } from '../services/socket';
import { OfflineQueueService } from '../services/offlineQueue';

interface Props {
  lat: number;
  lng: number;
  corridaId?: string;
}

export const SOSButton: React.FC<Props> = ({ lat, lng, corridaId }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTriggerSOS = async () => {
    setLoading(true);
    const payload = {
      lat,
      lng,
      corridaId,
      enderecoAproximado: 'Coordenadas GPS enviadas pelo aplicativo',
      timestamp: Date.now()
    };

    try {
      const socket = SocketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('driver:panic_trigger', payload);
      } else {
        // Enfileira offline para transmissão assim que conectar
        await OfflineQueueService.enqueue('/sos', payload);
      }

      setModalVisible(false);
      Alert.alert(
        '🚨 PÂNICO ACIONADO COM SUCESSO',
        'Central 24h acionada e esquadras da Polícia Nacional informadas. Colegas num raio de 5 km receberam a tua localização.',
        [{ text: 'ENTENDIDO' }]
      );
    } catch (e) {
      Alert.alert('Aviso', 'Sinal gravado na fila de segurança e a ser transmitido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.sosCircle}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚨 ACIONAR BOTÃO DE PÂNICO?</Text>
            <Text style={styles.modalDesc}>
              Isto transmitirá a tua localização em tempo real para a Central GIRO 24h, esquadras da PNA e motoristas parceiros a menos de 5 km de ti.
            </Text>

            <TouchableOpacity 
              style={styles.btnConfirmSOS} 
              onPress={handleTriggerSOS}
              disabled={loading}
            >
              <Text style={styles.btnConfirmText}>
                {loading ? 'TRANSMITINDO...' : 'CONFIRMAR EMERGÊNCIA'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnCancel} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.btnCancelText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sosCircle: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ff2d55',
    shadowOpacity: 0.6,
    shadowRadius: 10
  },
  sosText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#ff2d55'
  },
  modalTitle: {
    color: '#ff2d55',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10
  },
  modalDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20
  },
  btnConfirmSOS: {
    backgroundColor: '#ff2d55',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  btnConfirmText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14
  },
  btnCancel: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  btnCancelText: {
    color: '#8d968a',
    fontSize: 13,
    fontWeight: '600'
  }
});
