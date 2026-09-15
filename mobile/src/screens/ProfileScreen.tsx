import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Linking, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiClient, describeApiError } from '../services/api';
import { LEGAL_URLS, SUPORTE_TELEFONE } from '../legal';
import { theme, kz } from '../theme';

export const ProfileScreen = () => {
  const { user, signOut, deleteAccount } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [apagarVisivel, setApagarVisivel] = useState(false);
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, h] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/corridas/historico?limite=20')
        ]);
        setPerfil(p.data);
        setHistorico(h.data.corridas);
      } catch {
        // perfil em cache continua visível sem rede
      }
    })();
  }, []);

  const confirmarEliminacao = async () => {
    setOcupado(true);
    try {
      await deleteAccount(senha);
    } catch (e) {
      Alert.alert('Não foi possível eliminar', describeApiError(e, 'Tente novamente.'));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{(user?.nome || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.nome}>{user?.nome}</Text>
        <Text style={styles.telefone}>+244 {user?.telefone}</Text>
        <Text style={styles.tipoBadge}>
          {user?.tipo === 'motorista' ? 'Motorista parceiro · 10% de comissão' : 'Passageiro GIRO'}
        </Text>

        {perfil && (
          <View style={styles.statsRow}>
            <Stat label="Avaliação" valor={`${Number(perfil.avaliacao_media || 5).toFixed(2)} ★`} />
            <Stat label="Viagens" valor={String(perfil.total_corridas || 0)} />
            <Stat
              label={user?.tipo === 'motorista' ? 'Hoje' : 'Carteira'}
              valor={kz(Number(user?.tipo === 'motorista' ? perfil.faturamento_hoje : perfil.saldo_disponivel) || 0)}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Últimas viagens</Text>
        {historico.length === 0 ? (
          <Text style={styles.vazio}>Ainda não tem viagens registadas.</Text>
        ) : (
          historico.map((c) => (
            <View key={c.id} style={styles.histRow}>
              <View style={styles.histLeft}>
                <Text style={styles.histDest} numberOfLines={1}>{c.destino_nome}</Text>
                <Text style={styles.histMeta}>
                  {new Date(c.criada_em).toLocaleDateString('pt-PT')} · {c.status}
                </Text>
              </View>
              <Text style={styles.histValor}>{kz(Number(c.valor_final || c.valor_estimado))}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Ajuda e legal</Text>
        <LinkRow texto="Falar com a Central 24h" onPress={() => Linking.openURL(`tel:${SUPORTE_TELEFONE}`)} />
        <LinkRow texto="Termos de Uso" onPress={() => Linking.openURL(LEGAL_URLS.termos)} />
        <LinkRow texto="Política de Privacidade" onPress={() => Linking.openURL(LEGAL_URLS.privacidade)} />

        <TouchableOpacity style={styles.btnSair} onPress={signOut}>
          <Text style={styles.btnSairText}>Terminar sessão</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnApagar} onPress={() => setApagarVisivel(true)}>
          <Text style={styles.btnApagarText}>Eliminar a minha conta</Text>
        </TouchableOpacity>

        <Text style={styles.versao}>GIRO Angola · versão 1.0.0</Text>
      </ScrollView>

      <Modal visible={apagarVisivel} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Eliminar conta</Text>
            <Text style={styles.modalDesc}>
              A sua conta e os seus dados pessoais serão eliminados de forma permanente.
              Os registos financeiros das viagens já concluídas são mantidos de forma anónima,
              por obrigação legal e fiscal. Esta acção não pode ser revertida.
            </Text>
            <TextInput
              style={styles.input}
              value={senha}
              onChangeText={setSenha}
              placeholder="Confirme a sua senha"
              placeholderTextColor="#555"
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.btnConfirmarApagar}
              onPress={confirmarEliminacao}
              disabled={ocupado || senha.length < 6}
            >
              {ocupado
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnConfirmarText}>Eliminar definitivamente</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setApagarVisivel(false)} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>Manter a minha conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const Stat: React.FC<{ label: string; valor: string }> = ({ label, valor }) => (
  <View style={styles.stat}>
    <Text style={styles.statValor}>{valor}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const LinkRow: React.FC<{ texto: string; onPress: () => void }> = ({ texto, onPress }) => (
  <TouchableOpacity style={styles.linkRow} onPress={onPress}>
    <Text style={styles.linkText}>{texto}</Text>
    <Text style={styles.linkChevron}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: theme.gold,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center'
  },
  avatarLetter: { color: '#000', fontSize: 32, fontWeight: '900' },
  nome: { color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  telefone: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },
  tipoBadge: { color: theme.gold, fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  statsRow: { flexDirection: 'row', marginTop: 22 },
  stat: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: theme.border
  },
  statValor: { color: theme.text, fontSize: 15, fontWeight: '900' },
  statLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  sectionTitle: { color: theme.gold, fontSize: 13, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  vazio: { color: theme.muted, fontSize: 12 },
  histRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border
  },
  histLeft: { flex: 1, marginRight: 12 },
  histDest: { color: theme.text, fontSize: 13, fontWeight: '700' },
  histMeta: { color: theme.muted, fontSize: 11, marginTop: 2 },
  histValor: { color: theme.gold, fontSize: 14, fontWeight: '800' },
  linkRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 12, padding: 15, marginBottom: 8,
    borderWidth: 1, borderColor: theme.border
  },
  linkText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  linkChevron: { color: theme.muted, fontSize: 20 },
  btnSair: {
    marginTop: 26, paddingVertical: 15, alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border
  },
  btnSairText: { color: theme.text, fontWeight: '800', fontSize: 14 },
  btnApagar: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  btnApagarText: { color: theme.danger, fontWeight: '700', fontSize: 13 },
  versao: { color: theme.muted, fontSize: 11, textAlign: 'center', marginTop: 22 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center',
    alignItems: 'center', padding: 22
  },
  modalCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 22, width: '100%',
    borderWidth: 1.5, borderColor: theme.danger
  },
  modalTitle: { color: theme.danger, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalDesc: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  input: {
    backgroundColor: theme.surfaceAlt, color: theme.text, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginTop: 18
  },
  btnConfirmarApagar: {
    backgroundColor: theme.danger, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 16
  },
  btnConfirmarText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  btnCancel: { paddingVertical: 14, alignItems: 'center' },
  btnCancelText: { color: theme.muted, fontSize: 13, fontWeight: '700' }
});
