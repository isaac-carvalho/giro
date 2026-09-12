
/* ==========================================================================
   1. SÍNTESE DE ÁUDIO NATIVA (WEB AUDIO API)
   ========================================================================== */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playHapticSound(type) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    }
    else if (type === 'radar') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    }
    else if (type === 'sos') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(960, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(960, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    }
  } catch(e) {}
  
  if (navigator.vibrate) {
    if (type === 'sos') navigator.vibrate([200, 100, 200, 100, 300]);
    else navigator.vibrate(40);
  }
}

/* ==========================================================================
   2. CONFIGURAÇÃO TARIFÁRIA ANGOLANA (MOTO -15%, CARGA +50%, COMISSÃO 15%)
   ========================================================================== */
const T_PAX = { base: 550, km: 240, min: 32, minimo: 1200, comissao: 0.15 };

const TIERS_PAX = [
  // GIRO Moto com 15% de desconto promocional / alta competitividade
  { id: 'moto', nome: 'GIRO Moto (Kupapata)', desc: '1 lugar · rápido no trânsito (−15%)', mult: 0.4675, cor: '#f0b429', eta: 3,
    svg: '<svg viewBox="0 0 40 26"><circle cx="8" cy="19" r="5" fill="none" stroke="#f0b429" stroke-width="2.4"/><circle cx="32" cy="19" r="5" fill="none" stroke="#f0b429" stroke-width="2.4"/><path d="M8 19l7-8h9l4 8M17 11l-3-4h-4" stroke="#f0b429" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'eco', nome: 'GIRO Económico', desc: '4 lugares · o mais pedido', mult: 1.0, cor: '#f4f6f1', eta: 4,
    svg: '<svg viewBox="0 0 40 26"><path d="M3 19v-5l3-6.6A1.9 1.9 0 0 1 7.8 6h24.4a1.9 1.9 0 0 1 1.8 1.4L37 14v5a1.3 1.3 0 0 1-1.3 1.3h-1.9A1.3 1.3 0 0 1 32.5 19v-1h-25v1a1.3 1.3 0 0 1-1.3 1.3H4.3A1.3 1.3 0 0 1 3 19Z" fill="#f4f6f1"/></svg>' },
  { id: 'conf', nome: 'GIRO Conforto', desc: 'Viatura recente · ar condicionado', mult: 1.45, cor: '#d4af37', eta: 6,
    svg: '<svg viewBox="0 0 40 26"><path d="M2 20v-6l3.2-7.2A2 2 0 0 1 7.1 5h25.8a2 2 0 0 1 1.9 1.3L38 14v6a1.4 1.4 0 0 1-1.4 1.4h-2.1A1.4 1.4 0 0 1 33.1 20v-1.2H6.9V20a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 20Z" fill="#d4af37"/></svg>' },
  { id: 'sete', nome: 'GIRO 7', desc: '7 lugares · família ou bagagem', mult: 1.9, cor: '#8d968a', eta: 9,
    svg: '<svg viewBox="0 0 40 26"><path d="M1 21v-7l3.4-8A2.1 2.1 0 0 1 6.4 4h27.2a2.1 2.1 0 0 1 2 1.7L39 14v7a1.5 1.5 0 0 1-1.5 1.5h-2.3A1.5 1.5 0 0 1 33.7 21v-1.3H6.3V21A1.5 1.5 0 0 1 4.8 22.5H2.5A1.5 1.5 0 0 1 1 21Z" fill="#8d968a"/></svg>' }
];

// Carga com +50% no frete estruturado para garantir rentabilidade
const TIERS_CARGO = [
  { id: 'c_moto', nome: 'GIRO Moto Carga', veiculo: 'Mota com caixa', capacidade: 'até 20 kg / 40×40×40 cm', maxKg: 20, base: 1050, km: 270, min: 38, minimo: 2250, eta: 5, cor: '#f0b429',
    svg: '<svg viewBox="0 0 40 26"><circle cx="8" cy="19" r="5" fill="none" stroke="#f0b429" stroke-width="2.4"/><circle cx="32" cy="19" r="5" fill="none" stroke="#f0b429" stroke-width="2.4"/><rect x="18" y="7" width="12" height="8" rx="1.5" fill="#f0b429"/></svg>' },
  { id: 'c_van', nome: 'GIRO Van', veiculo: 'Carrinha fechada', capacidade: 'até 500 kg / 4 m³', maxKg: 500, base: 3750, km: 630, min: 82, minimo: 7500, eta: 8, cor: '#48cae4',
    svg: '<svg viewBox="0 0 40 26"><path d="M2 19v-9l4-4h24l6 5v8a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="#48cae4"/></svg>' },
  { id: 'c_ligeiro', nome: 'GIRO Camião Ligeiro', veiculo: 'Camião caixa aberta 1,5 t', capacidade: 'até 1.500 kg / 9 m³', maxKg: 1500, base: 9000, km: 1170, min: 135, minimo: 21000, eta: 12, cor: '#ffb703',
    svg: '<svg viewBox="0 0 40 26"><path d="M2 19v-4h18V8h12l5 6v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="#ffb703"/></svg>' },
  { id: 'c_medio', nome: 'GIRO Camião Médio', veiculo: 'Camião 3,5 t', capacidade: 'até 3.500 kg / 18 m³', maxKg: 3500, base: 18000, km: 1875, min: 210, minimo: 45000, eta: 18, cor: '#fb8500',
    svg: '<svg viewBox="0 0 40 26"><path d="M1 20v-5h19V6h13l6 8v6a1 1 0 0 1-1 1h-2v-1H8v1H3a1 1 0 0 1-1-1Z" fill="#fb8500"/></svg>' },
  { id: 'c_mudanca', nome: 'GIRO Mudanças', veiculo: 'Camião com equipa', capacidade: 'até 5.000 kg / 25 m³', maxKg: 5000, base: 37500, km: 2400, min: 270, minimo: 90000, eta: 25, cor: '#d4af37',
    svg: '<svg viewBox="0 0 40 26"><path d="M1 20v-6h20V5h13l5 8v7a1 1 0 0 1-1 1h-2v-1H8v1H3a1 1 0 0 1-1-1Z" fill="#d4af37"/></svg>' }
];

const DESTINOS = {
  luanda: {
    origem: 'Talatona, Rua Principal',
    favs: [['Casa', 'Centralidade do Kilamba, Bloco 12', 6.2, 14], ['Trabalho', 'Belas Business Park', 3.1, 9]],
    lista: [['Centralidade do Kilamba', 6.2, 14], ['Ilha de Luanda', 11.4, 26], ['Miramar', 8.1, 19], ['Aeroporto 4 de Fevereiro', 14.7, 31], ['Viana', 18.3, 38], ['Cazenga', 15.9, 34], ['Mutamba', 12.6, 29]]
  },
  benguela: {
    origem: 'Praia Morena, Benguela',
    favs: [['Casa', 'Bairro Cassequel', 4.4, 11], ['Trabalho', 'Centro da cidade', 2.8, 8]],
    lista: [['Baía Azul', 12.1, 24], ['Lobito (centro)', 31.5, 44], ['Aeroporto de Benguela', 6.7, 15], ['Restinga', 9.8, 21]]
  },
  lobito: {
    origem: 'Restinga, Lobito',
    favs: [['Casa', 'Bairro Canata', 5.1, 13], ['Trabalho', 'Porto do Lobito', 3.9, 11]],
    lista: [['Catumbela', 13.4, 25], ['Benguela (centro)', 30.2, 42], ['Compão', 7.2, 17]]
  },
  huambo: {
    origem: 'Centro do Huambo',
    favs: [['Casa', 'Bairro Académico', 3.7, 10], ['Trabalho', 'Mercado do Huambo', 2.4, 7]],
    lista: [['Aeroporto do Huambo', 5.9, 14], ['Caála', 22.8, 35], ['São João', 6.6, 16]]
  },
  lubango: {
    origem: 'Centro do Lubango',
    favs: [['Casa', 'Bairro Nossa Senhora do Monte', 4.9, 12], ['Trabalho', 'Millenium Mall', 3.2, 9]],
    lista: [['Cristo Rei', 5.4, 13], ['Serra da Leba', 38.6, 58], ['Aeroporto Mukanka', 7.1, 16], ['Arimba', 6.3, 15]]
  },
  cabinda: {
    origem: 'Centro de Cabinda',
    favs: [['Casa', 'Bairro Simulambuco', 4.2, 11], ['Trabalho', 'Porto de Cabinda', 5.8, 14]],
    lista: [['Aeroporto de Cabinda', 6.4, 15], ['Malembo', 18.7, 32], ['Tchiowa', 3.9, 10]]
  },
  malanje: {
    origem: 'Centro de Malanje',
    favs: [['Casa', 'Bairro Carreira de Tiro', 3.8, 10], ['Trabalho', 'Mercado Central', 2.6, 8]],
    lista: [['Aeroporto de Malanje', 7.4, 17], ['Pedras Negras', 115, 95]]
  },
  namibe: {
    origem: 'Centro do Namibe',
    favs: [['Casa', 'Bairro Saco Mar', 5.3, 13], ['Trabalho', 'Porto do Namibe', 4.1, 11]],
    lista: [['Praia Amélia', 14.2, 26], ['Aeroporto Yuri Gagarin', 5.6, 14], ['Tômbwa', 85, 72]]
  },
  soyo: {
    origem: 'Centro do Soyo',
    favs: [['Casa', 'Bairro Sequele', 4.6, 12], ['Trabalho', 'Base Petrolífera', 9.3, 20]],
    lista: [['Aeroporto do Soyo', 6.9, 16], ['Pedra do Feitiço', 24.5, 40]]
  },
  uige: {
    origem: 'Centro do Uíge',
    favs: [['Casa', 'Bairro Papelão', 3.4, 9], ['Trabalho', 'Mercado do Uíge', 2.2, 7]],
    lista: [['Aeroporto do Uíge', 5.7, 14], ['Negage', 48.2, 62]]
  }
};

const ESQUADRAS_POLICIA = [
  { prov: 'Luanda', nome: '7ª Esquadra — Talatona', tel: '+244 923 111 007', oficial: 'Insp. Chefe Garcia', eta: '3 min' },
  { prov: 'Luanda', nome: '14ª Esquadra — Kilamba', tel: '+244 923 111 014', oficial: 'Sub-Insp. Afonso', eta: '4 min' },
  { prov: 'Luanda', nome: '1ª Esquadra — Mutamba', tel: '+244 923 111 001', oficial: 'Insp. Baptista', eta: '2 min' },
  { prov: 'Benguela', nome: '2ª Esquadra — Praia Morena', tel: '+244 923 222 002', oficial: 'Sub-Insp. Dinis', eta: '4 min' },
  { prov: 'Lobito', nome: '1ª Esquadra — Restinga', tel: '+244 923 222 011', oficial: 'Insp. Kassoma', eta: '3 min' },
  { prov: 'Huambo', nome: 'Comando do Huambo', tel: '+244 923 333 001', oficial: 'Insp. Tchissola', eta: '5 min' },
  { prov: 'Lubango', nome: '2ª Esquadra — N. Sra. Monte', tel: '+244 923 444 002', oficial: 'Sub-Insp. Muatxissengue', eta: '4 min' },
  { prov: 'Cabinda', nome: '1ª Esquadra de Cabinda', tel: '+244 923 555 001', oficial: 'Insp. Luemba', eta: '3 min' }
];

const kz = n => Math.round(n).toLocaleString('pt-PT') + ' Kz';

/* ==========================================================================
   3. ESTADO GLOBAL DA APLICAÇÃO
   ========================================================================== */
let activeView = 'pax'; // 'pax' | 'drv' | 'cen'
let appMode = 'pax';    // 'pax' | 'delivery' | 'cargo'
let currentProv = 'luanda';
let provMult = 1.0;

let tripKm = 6.2;
let tripMins = 14;
let destName = 'Centralidade do Kilamba';
let stopsList = [];
let offerMultiplier = 1.0;

let tierIdx = 1;
let payMethod = 'Multicaixa Express';
let surgeMult = 1.0;

// Carga
let cargoWeight = 350;
let cargoHelpers = 1;
let cargoInsurance = false;
let cargoUrgent = false;

// Perfil de condutor cadastrado
let registeredDriver = {
  name: 'Domingos Manuel',
  phone: '+244 923 111 222',
  type: 'carro',
  plate: 'LD-23-45-AA',
  bi: '004829182LA041',
  payoutType: 'express',
  payoutVal: '+244 923 111 222',
  status: 'Aprovado'
};

/* ==========================================================================
   4. CÁLCULOS MATEMÁTICOS DE TARIFA
   ========================================================================== */
function calculateEffectiveDistance() {
  let k = tripKm;
  let m = tripMins;
  stopsList.forEach(s => { k += s.km; m += s.mins; });
  return { k, m };
}

function calculatePaxPrice(tierObj) {
  const { k, m } = calculateEffectiveDistance();
  const bruto = (T_PAX.base + T_PAX.km * k + T_PAX.min * m) * provMult * tierObj.mult * surgeMult * offerMultiplier;
  return Math.max(T_PAX.minimo * provMult * (tierObj.id === 'moto' ? 0.85 : 1.0), bruto);
}

function calculateCargoPrice(tierObj) {
  const { k, m } = calculateEffectiveDistance();
  let baseCalc = (tierObj.base + tierObj.km * k + tierObj.min * m) * provMult;
  baseCalc += (cargoHelpers * 12000);
  if (cargoInsurance) baseCalc += Math.max(4500, 150000 * 0.02);
  if (cargoUrgent) baseCalc *= 1.3;
  return Math.max(tierObj.minimo * provMult, baseCalc * offerMultiplier);
}

/* ==========================================================================
   5. GEOLOCALIZAÇÃO GPS NATIVA (HTML5 GEOLOCATION API)
   ========================================================================== */
function requestGPSLocation(target) {
  if (!navigator.geolocation) {
    alert('Geolocalização GPS não suportada neste dispositivo. Usando ponto de rede local.');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(4);
      const lng = pos.coords.longitude.toFixed(4);
      const msg = `📍 GPS Detectado com Sucesso:
Latitude: ${lat}
Longitude: ${lng}
Precisão: ${pos.coords.accuracy}m`;
      if (target === 'pax') {
        document.getElementById('pax-orig-text').textContent = `Localização Actual GPS (${lat}, ${lng})`;
        document.getElementById('pax-orig-text2').textContent = `Localização Actual GPS (${lat}, ${lng})`;
        document.getElementById('pax-origin-lab').textContent = 'Você (GPS)';
      }
      playHapticSound('beep');
      alert(msg);
    },
    err => {
      alert('Aviso GPS: Permissão não concedida ou sinal fraco. Mantendo coordenadas de referência de ' + currentProv.toUpperCase() + '.');
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

/* ==========================================================================
   6. PALETA DE CORES (BLACK & GOLD vs EMERALD ORIGINAL)
   ========================================================================== */
function toggleThemePalette() {
  document.body.classList.toggle('theme-emerald');
  const isEmerald = document.body.classList.contains('theme-emerald');
  document.getElementById('theme-switch-btn').textContent = isEmerald ? '🌿' : '✨';
  playHapticSound('beep');
}

/* ==========================================================================
   7. CADASTRO & VERIFICAÇÃO DE DOCUMENTOS (B.I., CARTA, PAGAMENTO)
   ========================================================================== */
function openAuthModal(role) {
  document.getElementById('auth-modal-el').classList.add('on');
  switchAuthRole(role || 'driver');
}

function closeAuthModal() {
  document.getElementById('auth-modal-el').classList.remove('on');
}

function switchAuthRole(role) {
  const isDrv = (role === 'driver');
  document.getElementById('auth-tab-driver').className = 'mode-tab' + (isDrv ? ' on' : '');
  document.getElementById('auth-tab-pax').className = 'mode-tab' + (!isDrv ? ' on' : '');
  document.getElementById('auth-modal-title').textContent = isDrv ? 'Cadastro de Parceiro GIRO' : 'Cadastro de Passageiro';
  document.getElementById('form-driver-auth').style.display = isDrv ? 'block' : 'none';
  document.getElementById('form-pax-auth').style.display = !isDrv ? 'block' : 'none';
  playHapticSound('beep');
}

function simulateDocUpload(boxId, text) {
  const el = document.getElementById(boxId);
  el.classList.add('uploaded');
  document.getElementById(boxId + '-text').textContent = '✓ ' + text;
  playHapticSound('beep');
}

function updateDriverFormFields() {
  const t = document.getElementById('reg-drv-type').value;
  const plateInp = document.getElementById('reg-drv-plate');
  if (t === 'moto') {
    plateInp.placeholder = 'Matrícula da Mota (ex: LD-12-34-M)';
  } else if (t === 'carga') {
    plateInp.placeholder = 'Matrícula do Camião/Van (ex: LD-88-90-CZ)';
  } else {
    plateInp.placeholder = 'Matrícula da Viatura (ex: LD-23-45-AA)';
  }
}

function handleDriverRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-drv-name').value;
  const phone = document.getElementById('reg-drv-phone').value;
  const type = document.getElementById('reg-drv-type').value;
  const plate = document.getElementById('reg-drv-plate').value;
  const bi = document.getElementById('reg-drv-bi').value;
  const pType = document.getElementById('reg-drv-payout-type').value;
  const pVal = document.getElementById('reg-drv-payout-val').value;

  registeredDriver = { name, phone, type, plate, bi, payoutType: pType, payoutVal: pVal, status: 'Aprovado' };

  document.getElementById('drv-profile-name').textContent = name + (type === 'carga' ? ' (Carga)' : type === 'moto' ? ' (Moto)' : '');
  document.getElementById('drv-role-select').value = (type === 'carga') ? 'cargo' : (type === 'moto') ? 'moto' : 'pax';
  document.getElementById('drv-account-preview').textContent = `${pType.toUpperCase()}: ${pVal}`;
  
  closeAuthModal();
  switchView('drv');
  alert(`✅ Cadastro de Parceiro Concluído com Sucesso!

Nome: ${name}
Categoria: ${type.toUpperCase()}
Documentos (B.I. ${bi}): Validados
Recebimento: ${pVal}

O seu perfil está 100% apto para iniciar e receber chamadas.`);
}

function handlePaxRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-pax-name').value;
  const phone = document.getElementById('reg-pax-phone').value;
  const bi = document.getElementById('reg-pax-bi').value;
  const addr = document.getElementById('reg-pax-addr').value;

  document.getElementById('pax-greeting').textContent = 'Boa tarde, ' + name.split(' ')[0];
  closeAuthModal();
  switchView('pax');
  alert(`✅ Perfil de Passageiro Verificado!

Nome: ${name}
B.I.: ${bi}
Endereço Registado: ${addr}

A sua conta foi validada segundo as directrizes de segurança de Angola.`);
}

/* ==========================================================================
   8. LEVANTAMENTO DA CARTEIRA DO MOTORISTA
   ========================================================================== */
function openWithdrawModal() {
  document.getElementById('withdraw-modal-bal').textContent = kz(driverBalance);
  document.getElementById('withdraw-modal-dest').textContent = registeredDriver.payoutVal ? `${registeredDriver.payoutType.toUpperCase()}: ${registeredDriver.payoutVal}` : 'Multicaixa Express (923 111 222)';
  document.getElementById('inp-withdraw-amt').value = driverBalance;
  document.getElementById('withdraw-modal-el').classList.add('on');
}

function closeWithdrawModal() {
  document.getElementById('withdraw-modal-el').classList.remove('on');
}

function executeWithdraw() {
  const amt = parseInt(document.getElementById('inp-withdraw-amt').value) || 0;
  if (amt <= 0 || amt > driverBalance) {
    alert('Valor de levantamento inválido ou superior ao saldo disponível.');
    return;
  }
  driverBalance -= amt;
  updateDriverWalletDisplay();
  closeWithdrawModal();
  alert(`💸 Transferência Concluída!

Valor: ${kz(amt)}
Destino: ${registeredDriver.payoutVal || '923 111 222'}
Processado via EMIS / Multicaixa Express Instantâneo.`);
}

/* ==========================================================================
   9. ALERTA DE SINISTRO PEER-TO-PEER ENTRE COLEGAS MOTORISTAS
   ========================================================================== */
function simulatePeerAlert() {
  playHapticSound('sos');
  document.getElementById('peer-sos-alert-banner').classList.add('on');
}

function dismissPeerSos() {
  document.getElementById('peer-sos-alert-banner').classList.remove('on');
}

function acceptPeerSupport() {
  document.getElementById('peer-sos-alert-banner').classList.remove('on');
  alert('Rota prioritária de apoio traçada no GPS! Viatura a caminho das coordenadas de socorro do colega.');
}

/* ==========================================================================
   10. NAVEGAÇÃO DE VISTAS (PASSAGEIRO, MOTORISTA, CENTRAL)
   ========================================================================== */
function switchView(view) {
  activeView = view;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('on', b.id === 'nav-btn-' + view));
  document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('on', v.id === 'view-' + view));
  playHapticSound('beep');
}

function setAppMode(mode) {
  appMode = mode;
  document.getElementById('tab-pax-mode').className = 'mode-tab' + (mode === 'pax' ? ' on' : '');
  document.getElementById('tab-deliv-mode').className = 'mode-tab' + (mode === 'delivery' ? ' on delivery' : '');
  document.getElementById('tab-cargo-mode').className = 'mode-tab' + (mode === 'cargo' ? ' on cargo' : '');

  if (mode === 'pax') {
    document.getElementById('pax-greeting').textContent = 'Boa tarde, Elisabete';
    document.getElementById('pax-sub-prompt').textContent = 'Para onde vamos em ' + document.getElementById('provSel').selectedOptions[0].textContent + '?';
    document.getElementById('pax-dest-prompt-text').textContent = 'Introduzir destino';
    tierIdx = 1;
  } else if (mode === 'delivery') {
    document.getElementById('pax-greeting').textContent = 'GIRO Entrega Rápida';
    document.getElementById('pax-sub-prompt').textContent = 'Documentos e encomendas por mota';
    document.getElementById('pax-dest-prompt-text').textContent = 'Onde entregar a encomenda?';
    tierIdx = 0;
  } else {
    document.getElementById('pax-greeting').textContent = 'GIRO Carga & Mudanças';
    document.getElementById('pax-sub-prompt').textContent = 'Transporte de peso, mercadorias e mudanças';
    document.getElementById('pax-dest-prompt-text').textContent = 'Local de descarga da mercadoria';
    tierIdx = 1;
  }
}

function setProv() {
  const s = document.getElementById('provSel');
  const o = s.options[s.selectedIndex];
  currentProv = s.value;
  provMult = parseFloat(o.dataset.mult);
  const d = DESTINOS[currentProv];

  document.getElementById('pax-orig-text').textContent = d.origem;
  document.getElementById('pax-orig-text2').textContent = d.origem;
  document.getElementById('deliv-orig-label').textContent = d.origem;
  document.getElementById('pax-origin-lab').textContent = o.textContent;

  buildFavoritesAndDestinations();
  paxTo('idle');
  renderCentralEsquadras();
}

function buildFavoritesAndDestinations() {
  const d = DESTINOS[currentProv];
  document.getElementById('pax-fav-list').innerHTML = d.favs.map(f => `
    <div class="sug-item" onclick="selectDestination('${f[1].replace(/'/g,"")}', ${f[2]}, ${f[3]})">
      <div class="sug-item-icon">${f[0] === 'Casa' ? '🏠' : '💼'}</div>
      <div><b>${f[0]}</b><small>${f[1]}</small></div>
    </div>
  `).join('');

  document.getElementById('pax-dest-list').innerHTML = d.lista.map(l => `
    <div class="sug-item" onclick="selectDestination('${l[0].replace(/'/g,"")}', ${l[1]}, ${l[2]})">
      <div class="sug-item-icon">📍</div>
      <div><b>${l[0]}</b><small>${l[1].toString().replace('.', ',')} km · ${l[2]} min</small></div>
    </div>
  `).join('');
}

function selectDestination(nome, k, m) {
  destName = nome;
  tripKm = k;
  tripMins = m;
  document.getElementById('pax-dest-lab').textContent = nome.split(',')[0];
  document.getElementById('deliv-dest-label').textContent = nome;

  if (appMode === 'cargo') paxTo('cargo');
  else if (appMode === 'delivery') paxTo('delivery');
  else paxTo('tier');
}

/* ==========================================================================
   11. MULTI-PARAGEM & CUBAGEM DE CARGA
   ========================================================================== */
function addStopInteractive() {
  if (stopsList.length >= 3) {
    alert('Limite máximo de 3 paragens atingido.');
    return;
  }
  const stopPoints = ['Bairro Azul, Rua 3', 'Maianga, Próx. ao Jardim', 'Camama, Rotunda', 'Benfica', 'Golf 2'];
  const name = stopPoints[stopsList.length % stopPoints.length];
  stopsList.push({ nome: name, km: 2.2, mins: 6 });
  renderStopsList();
  playHapticSound('beep');
}

function removeStopAt(idx) {
  stopsList.splice(idx, 1);
  renderStopsList();
}

function renderStopsList() {
  const container = document.getElementById('pax-stops-container');
  if (stopsList.length === 0) {
    container.innerHTML = '';
    document.getElementById('pax-pin-stop').style.opacity = 0;
    return;
  }
  document.getElementById('pax-pin-stop').style.opacity = 1;
  document.getElementById('pax-stop-lab').textContent = stopsList[0].nome.split(',')[0];
  container.innerHTML = stopsList.map((s, i) => `
    <div class="input-field-card" style="background:#191d17;">
      <span class="sq-dot stop"></span>
      <span>Paragem ${i + 1}: ${s.nome}</span>
      <span class="stop-del" onclick="removeStopAt(${i})">✕</span>
    </div>
  `).join('');
}

function selectCargoPreset(el, type, weight) {
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  cargoWeight = weight;
  if (weight <= 20) tierIdx = 0;
  else if (weight <= 500) tierIdx = 1;
  else if (weight <= 1500) tierIdx = 2;
  else tierIdx = 3;
}

function updateHelpersDelta(delta) {
  cargoHelpers = Math.max(0, Math.min(2, cargoHelpers + delta));
  document.getElementById('cargo-helpers-display').textContent = cargoHelpers;
}

function setFareOffer(multiplier, el) {
  offerMultiplier = multiplier;
  document.querySelectorAll('#fare-negotiation-box .offer-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderFareSummary();
  playHapticSound('beep');
}

function toggleCargoInsurance() {
  cargoInsurance = !cargoInsurance;
  document.getElementById('sw-cargo-insurance').classList.toggle('on', cargoInsurance);
  renderFareSummary();
}

function toggleCargoUrgent() {
  cargoUrgent = !cargoUrgent;
  document.getElementById('sw-cargo-urgent').classList.toggle('on', cargoUrgent);
  renderFareSummary();
}

/* ==========================================================================
   12. RENDERIZAR TIERS & TARIFA
   ========================================================================== */
function renderTiers() {
  const isCargo = (appMode === 'cargo');
  const isDelivery = (appMode === 'delivery');
  const d = DESTINOS[currentProv];
  const { k, m } = calculateEffectiveDistance();

  document.getElementById('cargo-extras-container').style.display = isCargo ? 'block' : 'none';
  document.getElementById('tier-pane-title').textContent = isCargo ? 'Veículos GIRO Carga' : isDelivery ? 'Opções de Entrega' : 'Escolher transporte';
  document.getElementById('tier-pane-subtitle').textContent = 
    d.origem.split(',')[0] + (stopsList.length ? ' (' + stopsList.length + ' paragens)' : '') + ' → ' + destName.split(',')[0] + ' · ' + k.toFixed(1).replace('.', ',') + ' km · ' + m + ' min';

  const container = document.getElementById('tier-list-container');

  if (isCargo) {
    container.innerHTML = TIERS_CARGO.map((t, i) => {
      const isSelected = (i === tierIdx);
      const isOver = (cargoWeight > t.maxKg);
      const price = calculateCargoPrice(t);
      return `
        <div class="tier-card ${isSelected ? 'on cargo-on' : ''} ${isSelected ? 'recommended' : ''}" onclick="selectTierIndex(${i})">
          <div class="tier-icon">${t.svg}</div>
          <div>
            <b>${t.nome}</b>
            <small>${t.veiculo} · ${t.capacidade}</small>
            ${isOver ? '<small style="color:var(--red);display:block;font-weight:700;">⚠ Carga excede limite da viatura</small>' : ''}
          </div>
          <div class="tier-price">
            <b>${kz(price)}</b>
            <small>ETA ${t.eta} min</small>
          </div>
        </div>`;
    }).join('');
  } else {
    container.innerHTML = TIERS_PAX.map((t, i) => {
      const isSelected = (i === tierIdx);
      const price = calculatePaxPrice(t);
      return `
        <div class="tier-card ${isSelected ? 'on' : ''}" onclick="selectTierIndex(${i})">
          <div class="tier-icon">${t.svg}</div>
          <div><b>${t.nome}</b><small>${t.desc} · ${t.eta} min</small></div>
          <div class="tier-price">
            <b>${kz(price)}</b>
            <small>${t.id === 'moto' ? 'sem bagagem' : 'chegada ' + getEstimatedClock(m + t.eta)}</small>
          </div>
        </div>`;
    }).join('');
  }

  renderFareSummary();
}

function getEstimatedClock(minsAdd) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minsAdd);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function selectTierIndex(idx) {
  tierIdx = idx;
  renderTiers();
  const name = (appMode === 'cargo') ? TIERS_CARGO[tierIdx].nome : TIERS_PAX[tierIdx].nome;
  document.getElementById('btn-confirm-tier').textContent = 'Confirmar ' + name;
  playHapticSound('beep');
}

function renderFareSummary() {
  const isCargo = (appMode === 'cargo');
  const { k, m } = calculateEffectiveDistance();
  const summaryBox = document.getElementById('pax-fare-summary');

  if (isCargo) {
    const t = TIERS_CARGO[tierIdx];
    const total = calculateCargoPrice(t);
    summaryBox.innerHTML = `
      <div class="fare-line"><span>Bandeirada (${t.nome})</span><b>${kz(t.base * provMult)}</b></div>
      <div class="fare-line"><span>${k.toFixed(1).replace('.', ',')} km × ${kz(t.km * provMult)}</span><b>${kz(t.km * k * provMult)}</b></div>
      <div class="fare-line"><span>${m} min de percurso</span><b>${kz(t.min * m * provMult)}</b></div>
      ${cargoHelpers > 0 ? `<div class="fare-line"><span>${cargoHelpers} Ajudante(s)</span><b>${kz(cargoHelpers * 12000)}</b></div>` : ''}
      ${cargoInsurance ? `<div class="fare-line"><span style="color:var(--gold)">Seguro Protect</span><b>${kz(Math.max(4500, 4500))}</b></div>` : ''}
      ${cargoUrgent ? `<div class="fare-line"><span style="color:var(--amb)">Urgência Prioritária (+30%)</span><b>aplicado</b></div>` : ''}
      <div class="fare-line total"><span>Total Estimado</span><b style="color:var(--gold);">${kz(total)}</b></div>
    `;
  } else {
    const t = TIERS_PAX[tierIdx];
    const total = calculatePaxPrice(t);
    summaryBox.innerHTML = `
      <div class="fare-line"><span>Bandeirada inicial</span><b>${kz(T_PAX.base * provMult * t.mult)}</b></div>
      <div class="fare-line"><span>${k.toFixed(1).replace('.', ',')} km × ${kz(T_PAX.km * provMult * t.mult)}</span><b>${kz(T_PAX.km * k * provMult * t.mult)}</b></div>
      <div class="fare-line"><span>${m} min de percurso</span><b>${kz(T_PAX.min * m * provMult * t.mult)}</b></div>
      ${stopsList.length > 0 ? `<div class="fare-line"><span>${stopsList.length} Paragens intermédias</span><b>incluído</b></div>` : ''}
      ${surgeMult > 1 ? `<div class="fare-line"><span style="color:var(--amb)">Procura alta ×${surgeMult}</span><b style="color:var(--amb)">aplicado</b></div>` : ''}
      <div class="fare-line total"><span>Total Estimado</span><b style="color:var(--gold);">${kz(total)}</b></div>
    `;
  }
}

function togglePayOptions() {
  document.getElementById('pay-options-drawer').classList.toggle('on');
}

function selectPaymentMethod(el, text) {
  document.querySelectorAll('.pay-opt-row').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  payMethod = text;
  document.getElementById('selected-pay-text').textContent = text;
  document.getElementById('pay-options-drawer').classList.remove('on');
  playHapticSound('beep');
}

/* ==========================================================================
   13. TRANSIÇÃO DE ESTADOS DO PASSAGEIRO
   ========================================================================== */
let paxActiveTimers = [];
const paxCarEl = document.getElementById('pax-car-el');
const paxRouteSvg = document.getElementById('pax-route-svg');
const paxPinB = document.getElementById('pax-pin-b');
const paxStatusBan = document.getElementById('pax-status-ban');

function clearPaxTimers() { paxActiveTimers.forEach(clearTimeout); paxActiveTimers = []; }
function showPaxPane(paneId) {
  document.querySelectorAll('#pax-sheet-container .sheet-pane').forEach(p => p.classList.toggle('on', p.id === paneId));
}

function paxBack() {
  paxTo('idle');
}

function paxTo(state) {
  clearPaxTimers();
  document.getElementById('pax-back-btn').style.display = (state === 'idle') ? 'none' : 'flex';
  paxStatusBan.style.display = 'none';

  if (state === 'idle') {
    showPaxPane('pane-idle');
    paxPinB.style.opacity = 0;
    paxCarEl.style.opacity = 0;
    paxRouteSvg.style.opacity = 0;
    paxCarEl.style.left = '280px';
    paxCarEl.style.top = '640px';
    document.querySelectorAll('#pax-star-rating .star-rating-icon').forEach(x => x.style.color = '#2c3128');
    document.getElementById('surge-indicator').classList.remove('on');
    surgeMult = 1.0;
  }
  else if (state === 'dest') {
    showPaxPane('pane-dest');
  }
  else if (state === 'delivery') {
    showPaxPane('pane-delivery');
  }
  else if (state === 'cargo') {
    showPaxPane('pane-cargo');
  }
  else if (state === 'tier') {
    surgeMult = (new Date().getHours() >= 17 || Math.random() > 0.6) ? 1.3 : 1.0;
    document.getElementById('surge-indicator').classList.toggle('on', surgeMult > 1);
    showPaxPane('pane-tier');
    renderTiers();
    paxPinB.style.opacity = 1;
    paxRouteSvg.style.opacity = 1;
    paxRouteSvg.animate([{ strokeDashoffset: 700 }, { strokeDashoffset: 0 }], { duration: 900, fill: 'forwards', easing: 'ease-out' });
  }
  else if (state === 'search') {
    showPaxPane('pane-search');
    playHapticSound('radar');
    const tierName = (appMode === 'cargo') ? TIERS_CARGO[tierIdx].nome : TIERS_PAX[tierIdx].nome;
    document.getElementById('search-pane-head').textContent = (appMode === 'cargo') ? 'A localizar viatura de carga…' : 'A procurar motorista…';
    document.getElementById('search-pane-sub').textContent = 'A contactar profissionais ' + tierName;
    const bar = document.getElementById('search-progress-bar');
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = 'progressBarAnim 4.5s linear forwards';
    paxActiveTimers.push(setTimeout(() => paxTo('trip'), 4600));
  }
  else if (state === 'trip') {
    showPaxPane('pane-trip');
    playHapticSound('beep');
    paxPinB.style.opacity = 1;
    paxCarEl.style.opacity = 1;
    paxStatusBan.style.display = 'flex';

    const isCargo = (appMode === 'cargo');
    const isDelivery = (appMode === 'delivery');

    if (isCargo) {
      document.getElementById('trip-driver-name').textContent = 'Mateus Kiala (Carga)';
      document.getElementById('trip-driver-meta').textContent = '★ 4.9 · ' + TIERS_CARGO[tierIdx].veiculo + ' · LD-55-90-CZ';
      document.getElementById('trip-driver-plate').textContent = 'LD-55-90-CZ';
      document.getElementById('trip-code-label').textContent = 'Código da Carga';
      document.getElementById('trip-code-val').textContent = '9 1 4 2';
      document.getElementById('trip-code-hint').textContent = 'Valide com o condutor ao iniciar o carregamento';
    } else if (isDelivery) {
      document.getElementById('trip-driver-name').textContent = 'Nelson Estafeta';
      document.getElementById('trip-driver-meta').textContent = '★ 4.8 · Mota Entrega · LD-88-12-MK';
      document.getElementById('trip-driver-plate').textContent = 'LD-88-12-MK';
      document.getElementById('trip-code-label').textContent = 'PIN de Entrega';
      document.getElementById('trip-code-val').textContent = '8 3 1 4';
      document.getElementById('trip-code-hint').textContent = 'O destinatário deve fornecer este PIN ao estafeta';
    } else {
      document.getElementById('trip-driver-name').textContent = registeredDriver.name;
      document.getElementById('trip-driver-meta').textContent = '★ 4.9 · Toyota Corolla cinza';
      document.getElementById('trip-driver-plate').textContent = registeredDriver.plate;
      document.getElementById('trip-code-label').textContent = 'Código de recolha';
      document.getElementById('trip-code-val').textContent = '4 7 2 9';
      document.getElementById('trip-code-hint').textContent = 'Diga o código ao motorista antes de entrar';
    }

    const path = [[280, 640], [280, 500], [190, 500], [100, 500]];
    path.forEach((p, i) => {
      paxActiveTimers.push(setTimeout(() => {
        paxCarEl.style.left = p[0] + 'px';
        paxCarEl.style.top = p[1] + 'px';
        const eta = Math.max(1, 4 - i);
        document.getElementById('pax-status-text').textContent = (i < path.length - 1) ? 'Viatura a chegar em ' + eta + ' min' : 'Viatura no local — pronto para embarque';
      }, i * 1100));
    });

    paxActiveTimers.push(setTimeout(() => {
      document.getElementById('pax-status-text').textContent = 'Em percurso para ' + destName.split(',')[0];
      const tripCoords = [[100, 360], [100, 220], [190, 220], [280, 220], [280, 90]];
      tripCoords.forEach((p, i) => {
        paxActiveTimers.push(setTimeout(() => {
          paxCarEl.style.left = p[0] + 'px';
          paxCarEl.style.top = p[1] + 'px';
        }, i * 1000));
      });
    }, 5200));
  }
  else if (state === 'end') {
    showPaxPane('pane-end');
    playHapticSound('beep');
    const isCargo = (appMode === 'cargo');
    const isDelivery = (appMode === 'delivery');
    const { k } = calculateEffectiveDistance();

    document.getElementById('end-cargo-proof-box').style.display = (isCargo || isDelivery) ? 'block' : 'none';
    document.getElementById('end-view-title').textContent = isCargo ? 'Carga entregue com sucesso' : isDelivery ? 'Encomenda entregue' : 'Chegou ao destino';
    document.getElementById('end-view-subtitle').textContent = DESTINOS[currentProv].origem.split(',')[0] + ' → ' + destName.split(',')[0] + ' · ' + k.toFixed(1).replace('.', ',') + ' km';

    const tot = isCargo ? calculateCargoPrice(TIERS_CARGO[tierIdx]) : calculatePaxPrice(TIERS_PAX[tierIdx]);
    const catName = isCargo ? TIERS_CARGO[tierIdx].nome : TIERS_PAX[tierIdx].nome;

    document.getElementById('end-fare-box').innerHTML = `
      <div class="fare-line"><span>Categoria / Veículo</span><b>${catName}</b></div>
      <div class="fare-line"><span>Pagamento</span><b>${payMethod}</b></div>
      ${isCargo && cargoHelpers > 0 ? `<div class="fare-line"><span>Ajudantes (${cargoHelpers})</span><b>${kz(cargoHelpers * 12000)}</b></div>` : ''}
      <div class="fare-line total"><span>Total pago</span><b style="color:var(--gold);">${kz(tot)}</b></div>
    `;
  }
}

document.querySelectorAll('#pax-star-rating .star-rating-icon').forEach(star => {
  star.onclick = () => {
    document.querySelectorAll('#pax-star-rating .star-rating-icon').forEach(x => {
      x.style.color = (+x.dataset.v <= +star.dataset.v) ? '#d4af37' : '#2c3128';
    });
    playHapticSound('beep');
  };
});

/* ==========================================================================
   14. MOTORISTA & CARTEIRA (COMISSÃO 15%)
   ========================================================================== */
let isDriverOnline = false;
let driverTripStage = 0;
let driverActiveTimers = [];
let driverRole = 'pax'; // 'pax' | 'moto' | 'cargo'

const drvCarEl = document.getElementById('drv-car-el');
const drvRouteSvg = document.getElementById('drv-route-svg');

function clearDriverTimers() { driverActiveTimers.forEach(clearTimeout); driverActiveTimers = []; }

function toggleDriverRole() {
  driverRole = document.getElementById('drv-role-select').value;
  document.getElementById('drv-profile-name').textContent = (driverRole === 'cargo') ? 'Mateus Kiala (Carga)' : (driverRole === 'moto') ? 'António Kupapata (Moto)' : 'Domingos Manuel';
  playHapticSound('beep');
}

function switchDriverSubTab(el) {
  document.querySelectorAll('#drv-home-dock .mode-tab').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('.dsub-pane').forEach(p => p.style.display = (p.id === el.dataset.target) ? 'block' : 'none');
  playHapticSound('beep');
}

function toggleDriverOnline() {
  isDriverOnline = !isDriverOnline;
  document.getElementById('drv-switch-btn').classList.toggle('on', isDriverOnline);
  const provText = document.getElementById('provSel').selectedOptions[0].textContent;
  document.getElementById('drv-online-status').textContent = isDriverOnline ? 'Online · à procura de serviços em ' + provText : 'Offline · toque para ficar disponível';
  playHapticSound('beep');

  if (isDriverOnline) {
    driverActiveTimers.push(setTimeout(() => {
      if (!isDriverOnline) return;
      const isCargo = (driverRole === 'cargo');
      const isMoto = (driverRole === 'moto');
      const gross = isCargo ? calculateCargoPrice(TIERS_CARGO[1]) : isMoto ? calculatePaxPrice(TIERS_PAX[0]) : calculatePaxPrice(TIERS_PAX[1]);
      const net = gross * (1 - T_PAX.comissao);

      document.getElementById('req-gross-amount').textContent = kz(gross);
      document.getElementById('req-net-amount').textContent = kz(net);
      document.getElementById('req-dest-name').textContent = destName;
      document.getElementById('req-trip-stats').textContent = tripKm.toString().replace('.', ',') + ' km · ' + tripMins + ' min de percurso';

      const badgeSlot = document.getElementById('drv-req-badge');
      const cardEl = document.getElementById('drv-incoming-card');

      if (isCargo) {
        cardEl.classList.add('cargo-type');
        badgeSlot.innerHTML = '<span style="background:var(--cargodeep);border:1px solid var(--cargo);color:var(--cargo);padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;margin-bottom:6px;">🚛 GIRO CARGA — Van 500 kg</span>';
      } else if (isMoto) {
        cardEl.classList.remove('cargo-type');
        badgeSlot.innerHTML = '<span style="background:var(--ambdeep);border:1px solid var(--amb);color:var(--amb);padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;margin-bottom:6px;">🏍 GIRO MOTO (Kupapata)</span>';
      } else {
        cardEl.classList.remove('cargo-type');
        badgeSlot.innerHTML = '<span style="background:var(--gold-deep);border:1px solid var(--gold);color:var(--gold);padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;margin-bottom:6px;">🚗 GIRO Económico</span>';
      }

      cardEl.classList.add('on');
      playHapticSound('radar');

      const bar = document.getElementById('drv-req-timeout');
      bar.classList.remove('run');
      void bar.offsetWidth;
      bar.classList.add('run');
    }, 1400));
  } else {
    declineIncomingTrip();
  }
}

function declineIncomingTrip() {
  document.getElementById('drv-incoming-card').classList.remove('on');
}

function acceptIncomingTrip() {
  document.getElementById('drv-incoming-card').classList.remove('on');
  document.getElementById('drv-home-dock').style.display = 'none';
  document.getElementById('drv-active-trip-dock').style.display = 'block';
  document.getElementById('drv-status-ban').style.display = 'flex';

  const isCargo = (driverRole === 'cargo');
  const isMoto = (driverRole === 'moto');
  document.getElementById('drv-cargo-details-banner').style.display = isCargo ? 'block' : 'none';
  document.getElementById('drv-status-text').textContent = isCargo ? 'A caminho da recolha da carga · 4 min' : 'A caminho do passageiro · 4 min';
  document.getElementById('drv-pin-target').style.opacity = 1;
  drvRouteSvg.style.opacity = 1;
  driverTripStage = 1;

  const gross = isCargo ? calculateCargoPrice(TIERS_CARGO[1]) : isMoto ? calculatePaxPrice(TIERS_PAX[0]) : calculatePaxPrice(TIERS_PAX[1]);
  const fee = gross * T_PAX.comissao;
  const net = gross - fee;

  document.getElementById('drv-trip-breakdown').innerHTML = `
    <div class="fare-line"><span>Tarifa bruta</span><b>${kz(gross)}</b></div>
    <div class="fare-line"><span style="color:var(--red);">Comissão retida GIRO (15%)</span><b style="color:var(--red);">− ${kz(fee)}</b></div>
    <div class="fare-line total"><span>Líquido a receber</span><b style="color:var(--gold);">${kz(net)}</b></div>
  `;

  playHapticSound('beep');

  [[120, 420], [120, 340], [120, 250]].forEach((p, i) => {
    driverActiveTimers.push(setTimeout(() => {
      drvCarEl.style.left = p[0] + 'px';
      drvCarEl.style.top = p[1] + 'px';
      document.getElementById('drv-trip-eta').textContent = Math.max(1, 3 - i) + ' min';
    }, i * 1200));
  });
}

function advanceDriverTrip() {
  driverTripStage++;
  const btn = document.getElementById('drv-step-action-btn');
  const isCargo = (driverRole === 'cargo');
  const isMoto = (driverRole === 'moto');

  if (driverTripStage === 2) {
    btn.textContent = isCargo ? 'Validar Código da Carga (9142)' : 'Confirmar código 4729';
    document.getElementById('drv-trip-leg-text').textContent = isCargo ? 'No local · a carregar mercadoria' : 'Passageiro no local · confirmar código';
    document.getElementById('drv-status-text').textContent = isCargo ? 'A carregar volumes...' : 'Peça o código de 4 dígitos';
    playHapticSound('beep');
  } else if (driverTripStage === 3) {
    btn.textContent = isCargo ? 'Cheguei ao destino (Descarregar)' : 'Terminar viagem';
    document.getElementById('drv-trip-leg-text').textContent = 'Destino · ' + destName;
    document.getElementById('drv-status-text').textContent = 'Em trânsito · ' + tripMins + ' min até ao destino';
    playHapticSound('beep');

    [[190, 250], [290, 250], [290, 180]].forEach((p, i) => {
      driverActiveTimers.push(setTimeout(() => {
        drvCarEl.style.left = p[0] + 'px';
        drvCarEl.style.top = p[1] + 'px';
        document.getElementById('drv-trip-eta').textContent = Math.max(1, tripMins - i * 5) + ' min';
      }, i * 1300));
    });
  } else {
    const gross = isCargo ? calculateCargoPrice(TIERS_CARGO[1]) : isMoto ? calculatePaxPrice(TIERS_PAX[0]) : calculatePaxPrice(TIERS_PAX[1]);
    const fee = gross * T_PAX.comissao;
    const net = gross - fee;

    alert((isCargo ? 'Operação de Carga Concluída!

' : 'Viagem Concluída!

') +
      'Tarifa Bruta: ' + kz(gross) + '
' +
      'Comissão GIRO (15%): − ' + kz(fee) + '
' +
      'Creditado na carteira: ' + kz(net));

    creditDriverWallet(net);
    clearDriverTimers();
    driverTripStage = 0;
    document.getElementById('drv-active-trip-dock').style.display = 'none';
    document.getElementById('drv-home-dock').style.display = 'block';
    document.getElementById('drv-status-ban').style.display = 'none';
    document.getElementById('drv-pin-target').style.opacity = 0;
    drvRouteSvg.style.opacity = 0;
    drvCarEl.style.left = '120px';
    drvCarEl.style.top = '500px';
    btn.textContent = 'Cheguei ao local';
    document.getElementById('drv-trip-leg-text').textContent = 'Recolha · ' + DESTINOS[currentProv].origem;
    isDriverOnline = false;
    document.getElementById('drv-switch-btn').classList.remove('on');
    document.getElementById('drv-online-status').textContent = 'Offline · toque para ficar disponível';
  }
}

let driverBalance = 47320;
let driverGrossToday = 18200;
let driverRidesCount = 9;

function updateDriverWalletDisplay() {
  document.getElementById('drv-wallet-balance').textContent = kz(driverBalance);
  document.getElementById('drv-net-today').textContent = kz(driverGrossToday * (1 - T_PAX.comissao));
  document.getElementById('drv-rides-count').textContent = driverRidesCount;
  document.getElementById('drv-wallet-breakdown').innerHTML = `
    <div class="fare-line"><span>Bruto hoje (${driverRidesCount} serviços)</span><b>${kz(driverGrossToday)}</b></div>
    <div class="fare-line"><span style="color:var(--red);">Comissão retida GIRO (15%)</span><b style="color:var(--red);">− ${kz(driverGrossToday * T_PAX.comissao)}</b></div>
    <div class="fare-line total"><span>Líquido acumulado</span><b style="color:var(--gold);">${kz(driverGrossToday * 0.85)}</b></div>
  `;
}

function creditDriverWallet(net) {
  driverBalance += net;
  driverGrossToday += (net / 0.85);
  driverRidesCount++;
  updateDriverWalletDisplay();
  renderDriverHistory();
}

function renderDriverHistory() {
  const items = [
    ['18:42', destName.split(',')[0], calculatePaxPrice(TIERS_PAX[1]), 'Passageiros (Carro)'],
    ['17:55', 'Viana (Carga)', 42000, 'GIRO Van (+50%)'],
    ['17:10', 'Ilha de Luanda', 5240, 'Passageiros (Carro)'],
    ['16:22', 'Talatona (Moto)', 1850, 'GIRO Moto (−15%)']
  ];
  document.getElementById('drv-history-list').innerHTML = items.map(r => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--ink3);font-size:11.5px;">
      <div><b>${r[1]}</b><small style="display:block;color:var(--mut);font-size:10px;">${r[0]} · ${r[3]}</small></div>
      <div style="text-align:right;"><b style="color:var(--gold);">${kz(r[2] * 0.85)}</b><small style="display:block;color:var(--mut);font-size:9.5px;">bruto ${kz(r[2])}</small></div>
    </div>
  `).join('');
}

/* ==========================================================================
   15. SISTEMA DE SEGURANÇA SOS & CENTRAL 24H
   ========================================================================== */
function bindHoldButton(buttonId, fillId) {
  const btn = document.getElementById(buttonId);
  const fill = document.getElementById(fillId);
  let timer = null;

  const startHold = e => {
    e.preventDefault();
    fill.classList.remove('run');
    void fill.offsetWidth;
    fill.classList.add('run');
    playHapticSound('beep');
    timer = setTimeout(triggerGlobalSos, 3000);
  };

  const cancelHold = () => {
    clearTimeout(timer);
    fill.classList.remove('run');
  };

  btn.addEventListener('mousedown', startHold);
  btn.addEventListener('touchstart', startHold, { passive: false });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => btn.addEventListener(evt, cancelHold));
}

bindHoldButton('pax-sos-hold-btn', 'pax-sos-fill-bar');
bindHoldButton('drv-sos-hold-btn', 'drv-sos-fill-bar');
bindHoldButton('drv-sos-hold-btn2', 'drv-sos-fill-bar2');

function triggerSilentSos() {
  alert('Alerta SOS Silencioso emitido: Telemetria, microfone e coordenadas transmitidas de imediato para a Central GIRO 24h e colegas na área sem alertas na tela.');
  pushCentralAlert('SOS_SILENT');
}

function triggerGlobalSos() {
  playHapticSound('sos');
  document.getElementById('global-sos-overlay').classList.add('on');
  pushCentralAlert('SOS_FULL');
  
  // Alerta também toda a rede de colegas motoristas
  simulatePeerAlert();
}

function cancelGlobalSos() {
  document.getElementById('global-sos-overlay').classList.remove('on');
  resolveCentralAlert();
}

function simulateDeviateAlert() {
  pushCentralAlert('DEVIATE');
  alert('Simulação de Desvio de Rota: Viatura saiu do trajecto traçado há 4 min. Alerta amarelo telemétrico gerado na Central 24h.');
}

function pushCentralAlert(type) {
  document.getElementById('cen-empty-alerts').style.display = 'none';
  document.getElementById('cen-kpi-sos').textContent = '1';
  document.getElementById('cen-alerts-count').textContent = '1 activo agora';

  if (document.getElementById('cen-alert-live-card')) return;

  const isYellow = (type === 'DEVIATE');
  const card = document.createElement('div');
  card.id = 'cen-alert-live-card';
  card.style.background = isYellow ? 'var(--ambdeep)' : 'var(--reddeep)';
  card.style.border = '1px solid ' + (isYellow ? 'var(--amb)' : 'var(--red)');
  card.style.borderRadius = '12px';
  card.style.padding = '11px';

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
      <span style="font-size:9.5px;font-weight:800;background:${isYellow ? 'var(--amb)' : 'var(--red)'};color:#070907;padding:2px 6px;border-radius:4px;">${isYellow ? 'DESVIO DE ROTA' : 'SOS ACTIVO (SINISTRO)'}</span>
      <small style="font-size:10px;color:var(--mut);">Agora</small>
    </div>
    <div style="font-size:12px;font-weight:700;">${registeredDriver.name} (${registeredDriver.plate})</div>
    <div style="font-size:10.5px;color:#e0c9cb;margin:3px 0 8px;">Rua do Talatona · Passageiro: Elisabete C. · Rede de Apoio: 12 motoristas notificados</div>
    <div style="display:flex;gap:5px;">
      <button style="flex:1;background:var(--red);color:#fff;border:none;padding:6px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;" onclick="alert('A contactar oficial da 7ª Esquadra Talatona e despacho de apoio...')">Ligar Esquadra</button>
      <button style="flex:1;background:rgba(255,255,255,.1);color:#fff;border:none;padding:6px;border-radius:6px;font-size:10px;cursor:pointer;" onclick="resolveCentralAlert()">Encerrar</button>
    </div>
  `;

  document.getElementById('cen-alerts-list').prepend(card);
}

function resolveCentralAlert() {
  const card = document.getElementById('cen-alert-live-card');
  if (card) card.remove();
  document.getElementById('cen-kpi-sos').textContent = '0';
  document.getElementById('cen-alerts-count').textContent = '0 activos';
  document.getElementById('cen-empty-alerts').style.display = 'block';
}

function renderCentralEsquadras() {
  document.getElementById('cen-esquadras-tbody').innerHTML = ESQUADRAS_POLICIA.map(e => `
    <tr style="border-bottom:1px solid var(--ink3);">
      <td style="padding:7px 10px;"><b>${e.prov}</b></td>
      <td style="padding:7px 10px;">${e.nome}</td>
      <td style="padding:7px 10px;color:var(--gold);font-weight:700;">${e.tel}</td>
      <td style="padding:7px 10px;">${e.oficial}</td>
      <td style="padding:7px 10px;color:var(--amb);font-weight:700;">${e.eta}</td>
      <td style="padding:7px 10px;"><button style="background:var(--ink3);border:1px solid var(--line);color:#fff;padding:3px 7px;border-radius:5px;font-size:10px;cursor:pointer;" onclick="alert('Canal prioritário para ${e.nome} acionado.')">Accionar</button></td>
    </tr>
  `).join('');
}

/* ==========================================================================
   16. AGENDAMENTO & PARTILHA MODAIS
   ========================================================================== */
function openShareModal() { document.getElementById('share-modal-el').classList.add('on'); }
function closeShareModal() { document.getElementById('share-modal-el').classList.remove('on'); }
function openScheduleModal() { document.getElementById('schedule-modal-el').classList.add('on'); }
function closeScheduleModal() { document.getElementById('schedule-modal-el').classList.remove('on'); }

function confirmScheduleModal() {
  const d = document.getElementById('sched-input-date').value;
  const t = document.getElementById('sched-input-time').value;
  document.getElementById('sched-trip-desc').textContent = d + ' às ' + t + ' · ' + ((appMode === 'cargo') ? 'GIRO Carga' : 'GIRO Conforto');
  document.getElementById('scheduled-trip-banner').style.display = 'block';
  closeScheduleModal();
  alert('Viagem agendada! O sistema alertará 30 min antes da recolha.');
}

/* ==========================================================================
   17. INICIALIZAÇÃO GERAL DA APLICAÇÃO
   ========================================================================== */
buildFavoritesAndDestinations();
renderTiers();
updateDriverWalletDisplay();
renderDriverHistory();
renderCentralEsquadras();
