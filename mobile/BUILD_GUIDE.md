# Publicar a GIRO Angola na Play Store e na App Store

App: **GIRO Angola** · Expo SDK 57 · React Native 0.86 · `ao.giro.app` (Android e iOS)

---

## 0. Antes de tudo — pré-requisitos

| Item | Onde | Custo |
|---|---|---|
| Conta Expo (EAS) | expo.dev | grátis para começar |
| Conta Google Play Console | play.google.com/console | 25 USD, uma vez |
| Conta Apple Developer | developer.apple.com | 99 USD/ano |
| Node 20 LTS | nodejs.org | — |
| API em produção com HTTPS | `https://api.giro.ao` | VPS |

> **Node:** o Expo CLI não corre em Node 25. Instale o Node 20 LTS antes de trabalhar localmente.
> A EAS Build usa o Node dela própria, por isso os builds na nuvem não são afectados.

---

## 1. Primeira configuração (uma só vez)

```bash
npm install -g eas-cli
cd mobile
npm install
eas login
eas init
```

O `eas init` escreve o `projectId` real. **Substitua `PREENCHER_APOS_EAS_INIT` no `app.json` por esse valor.**

Verifique se está tudo são:

```bash
npx expo-doctor
npm run typecheck
```

Ambos têm de passar sem erros antes de qualquer build.

---

## 2. Build de teste (APK, para instalar em Luanda)

```bash
eas build --platform android --profile preview
```

Sai um `.apk` que se instala directamente no telemóvel. É por aqui que se testa com motoristas reais antes de submeter.

---

## 3. Build de produção

```bash
# Android — App Bundle (.aab) para a Play Store
eas build --platform android --profile production

# iOS — .ipa para a App Store / TestFlight
eas build --platform ios --profile production
```

A chave de assinatura Android é gerada e guardada pela EAS na primeira vez. **Guarde uma cópia** (`eas credentials`) — se a perder, nunca mais consegue actualizar o app publicado.

---

## 4. Submeter

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Antes disto, preencha no `eas.json`:
- `ascAppId` — o ID do app no App Store Connect
- `appleTeamId` — o Team ID da conta Apple
- `play-service-account.json` — a chave de serviço da Google Play (**não a versione no git**)

---

## 5. O que a Google Play vai exigir na ficha

- [x] Política de privacidade pública → `https://isaac-carvalho.github.io/giro/privacidade.html`
- [x] Exclusão de conta no app **e** por URL → `https://isaac-carvalho.github.io/giro/eliminar-conta.html`
- [x] Target API 35+ → cumprido pelo Expo SDK 57
- [ ] **Data safety form** — declarar: localização (precisa e aproximada), identificadores pessoais, informação financeira. Marcar que os dados são cifrados em trânsito e que o utilizador pode pedir a eliminação.
- [ ] **Declaração de localização em segundo plano** — a Google pede um vídeo a mostrar o ecrã onde a permissão é pedida e o que a justifica. Grave o painel do motorista a passar para «Online». Justificação: manter o motorista no radar para receber corridas e permitir a localização em alerta de pânico.
- [ ] Capturas de ecrã: pelo menos 2, em 1080×1920.
- [ ] Ícone 512×512, imagem de destaque 1024×500.
- [ ] Classificação de conteúdo (questionário) e público-alvo 18+.

## 6. O que a Apple vai exigir

- [ ] **Privacy Nutrition Labels** no App Store Connect — as mesmas categorias acima.
- [ ] **Conta de demonstração** para o revisor: um telemóvel e senha de teste que funcionem, com corridas simuláveis. A Apple rejeita se não conseguir entrar.
- [ ] Justificação do `UIBackgroundModes: location` nas notas do revisor.
- [ ] Capturas para iPhone 6.7" e 6.5".
- [ ] Suporte visível no app (já está no separador **Conta**).

---

## 7. Optimizações para Angola já aplicadas

- Mapas por tiles OpenStreetMap — sem custo de API de mapas.
- Posição do motorista enviada com intervalo mínimo de 6 s, para poupar dados e bateria.
- `timeout` de 15 s nos pedidos HTTP, adequado a redes 2G/3G.
- Reconexão automática do WebSocket, com recuo progressivo.
- Fila offline para alertas de pânico: se não houver rede, o alerta é guardado e transmitido assim que a ligação voltar.
- Tema escuro em todo o app — ecrãs OLED gastam menos bateria.
