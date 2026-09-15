import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch, Linking
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { describeApiError } from '../services/api';
import { theme } from '../theme';
import { LEGAL_URLS } from '../legal';

const CATEGORIAS_MOTORISTA = [
  { key: 'moto', label: 'Moto (Kupapata)' },
  { key: 'economico', label: 'Económico' },
  { key: 'conforto', label: 'Conforto' },
  { key: 'giro_7', label: 'GIRO 7' },
  { key: 'carga_pickup', label: 'Pick-Up / Carga' }
];

export const RegisterScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { register } = useAuth();
  const [tipo, setTipo] = useState<'passageiro' | 'motorista'>('passageiro');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [biNumero, setBiNumero] = useState('');
  const [categoria, setCategoria] = useState('economico');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cor, setCor] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const validar = () => {
    if (nome.trim().length < 3) return 'Escreva o seu nome completo.';
    if (!/^9\d{8}$/.test(telefone)) return 'Número angolano inválido (9 dígitos, a começar por 9).';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'Email inválido.';
    if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (senha !== senha2) return 'As senhas não coincidem.';
    if (!aceitouTermos) return 'É preciso aceitar os Termos e a Política de Privacidade.';
    if (tipo === 'motorista') {
      if (!marca.trim() || !modelo.trim()) return 'Indique a marca e o modelo da viatura.';
      if (!matricula.trim()) return 'Indique a matrícula da viatura.';
      if (!cor.trim()) return 'Indique a cor da viatura.';
    }
    return null;
  };

  const handleRegister = async () => {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }

    setErro('');
    setLoading(true);
    try {
      await register({
        nome: nome.trim(),
        telefone,
        email: email.trim() || undefined,
        senha,
        tipo,
        biNumero: biNumero.trim() || undefined,
        veiculo: tipo === 'motorista' ? {
          categoria,
          marca: marca.trim(),
          modelo: modelo.trim(),
          ano: ano ? Number(ano) : undefined,
          matricula: matricula.trim().toUpperCase(),
          cor: cor.trim()
        } : undefined
      });
    } catch (e) {
      setErro(describeApiError(e, 'Não foi possível criar a conta.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Criar conta GIRO</Text>

        <View style={styles.tipoRow}>
          {(['passageiro', 'motorista'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tipoChip, tipo === t && styles.tipoChipActive]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.tipoText, tipo === t && styles.tipoTextActive]}>
                {t === 'passageiro' ? 'Sou Passageiro' : 'Sou Motorista'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Nome completo" value={nome} onChange={setNome} placeholder="Ex: António da Silva" />

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
            maxLength={9}
          />
        </View>

        <Field label="Email (opcional)" value={email} onChange={setEmail} placeholder="exemplo@gmail.com" keyboardType="email-address" />
        <Field label="Nº do Bilhete de Identidade (opcional)" value={biNumero} onChange={setBiNumero} placeholder="Ex: 000000000LA000" />
        <Field label="Senha" value={senha} onChange={setSenha} placeholder="••••••••" secure />
        <Field label="Confirmar senha" value={senha2} onChange={setSenha2} placeholder="••••••••" secure />

        {tipo === 'motorista' && (
          <View style={styles.vehicleBox}>
            <Text style={styles.sectionTitle}>Dados da viatura</Text>

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.catWrap}>
              {CATEGORIAS_MOTORISTA.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catChip, categoria === c.key && styles.catChipActive]}
                  onPress={() => setCategoria(c.key)}
                >
                  <Text style={[styles.catText, categoria === c.key && styles.catTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Marca" value={marca} onChange={setMarca} placeholder="Ex: Toyota" />
            <Field label="Modelo" value={modelo} onChange={setModelo} placeholder="Ex: Vitz" />
            <Field label="Ano" value={ano} onChange={(t) => setAno(t.replace(/\D/g, '').slice(0, 4))} placeholder="Ex: 2016" keyboardType="number-pad" />
            <Field label="Matrícula" value={matricula} onChange={setMatricula} placeholder="Ex: LD-00-00-AA" autoCapitalize="characters" />
            <Field label="Cor" value={cor} onChange={setCor} placeholder="Ex: Prateado" />

            <Text style={styles.docNote}>
              Após o cadastro, a Central GIRO vai pedir as fotos do BI, carta de condução, livrete e seguro para validar a sua conta de motorista.
            </Text>
          </View>
        )}

        <View style={styles.termsRow}>
          <Switch
            value={aceitouTermos}
            onValueChange={setAceitouTermos}
            trackColor={{ false: '#333', true: theme.green }}
          />
          <Text style={styles.termsText}>
            Aceito os{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL_URLS.termos)}>Termos de Uso</Text>
            {' '}e a{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL_URLS.privacidade)}>Política de Privacidade</Text>
            , e confirmo ter 18 anos ou mais.
          </Text>
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Criar conta</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}> = ({ label, value, onChange, placeholder, secure, keyboardType, autoCapitalize }) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#555"
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize || 'none'}
    />
  </>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  container: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  back: { color: theme.gold, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  title: { color: theme.text, fontSize: 24, fontWeight: '900', marginBottom: 18 },
  tipoRow: { flexDirection: 'row', marginBottom: 20 },
  tipoChip: {
    flex: 1, paddingVertical: 12, backgroundColor: theme.surface, borderRadius: 12,
    marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  tipoChipActive: { borderColor: theme.gold, backgroundColor: '#1f1a10' },
  tipoText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  tipoTextActive: { color: theme.gold },
  label: { color: theme.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: theme.surfaceAlt, color: theme.text, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceAlt,
    borderRadius: 10, paddingHorizontal: 12
  },
  prefix: { color: theme.gold, fontWeight: '800', fontSize: 14, marginRight: 8 },
  phoneInput: { flex: 1, color: theme.text, paddingVertical: 12, fontSize: 15, letterSpacing: 1 },
  vehicleBox: {
    marginTop: 20, padding: 14, backgroundColor: theme.surface,
    borderRadius: 14, borderWidth: 1, borderColor: theme.border
  },
  sectionTitle: { color: theme.gold, fontSize: 14, fontWeight: '800' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.surfaceAlt,
    borderRadius: 20, margin: 3, borderWidth: 1, borderColor: theme.border
  },
  catChipActive: { borderColor: theme.gold, backgroundColor: '#1f1a10' },
  catText: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  catTextActive: { color: theme.gold },
  docNote: { color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 14 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  termsText: { color: theme.muted, fontSize: 11, lineHeight: 16, flex: 1, marginLeft: 10 },
  link: { color: theme.gold, fontWeight: '700', textDecorationLine: 'underline' },
  erro: { color: theme.danger, fontSize: 12, marginTop: 14, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: theme.gold, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 20
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '900' }
});
