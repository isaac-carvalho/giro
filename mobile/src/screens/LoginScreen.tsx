import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { describeApiError } from '../services/api';
import { theme } from '../theme';

export const LoginScreen: React.FC<{ onGoToRegister: () => void }> = ({ onGoToRegister }) => {
  const { signIn } = useAuth();
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErro('');
    if (!/^9\d{8}$/.test(telefone)) {
      setErro('Introduza um número angolano válido (9 dígitos, a começar por 9).');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signIn(telefone, senha);
    } catch (e) {
      setErro(describeApiError(e, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>GIRO</Text>
        <Text style={styles.tagline}>Mobilidade, carga e segurança em Angola</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Telemóvel</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+244</Text>
            <TextInput
              style={styles.phoneInput}
              value={telefone}
              onChangeText={(t) => setTelefone(t.replace(/\D/g, '').slice(0, 9))}
              placeholder="9XX XXX XXX"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              autoComplete="tel"
              maxLength={9}
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Senha</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry
            autoComplete="current-password"
          />

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Entrar</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnGhost} onPress={onGoToRegister}>
          <Text style={styles.btnGhostText}>Ainda não tem conta? <Text style={styles.link}>Criar conta</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { color: theme.gold, fontSize: 44, fontWeight: '900', textAlign: 'center', letterSpacing: 4 },
  tagline: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 32 },
  card: {
    backgroundColor: theme.surface, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: theme.border
  },
  label: { color: theme.muted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceAlt,
    borderRadius: 10, paddingHorizontal: 12
  },
  prefix: { color: theme.gold, fontWeight: '800', fontSize: 14, marginRight: 8 },
  phoneInput: { flex: 1, color: theme.text, paddingVertical: 12, fontSize: 15, letterSpacing: 1 },
  input: {
    backgroundColor: theme.surfaceAlt, color: theme.text, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15
  },
  erro: { color: theme.danger, fontSize: 12, marginTop: 12, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: theme.gold, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 20
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '900' },
  btnGhost: { paddingVertical: 18, alignItems: 'center' },
  btnGhostText: { color: theme.muted, fontSize: 13 },
  link: { color: theme.gold, fontWeight: '800' }
});
