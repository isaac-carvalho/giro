# Guia de Build Android (AAB/APK) e iOS (IPA) — GIRO Angola

Este guia descreve o processo de empacotamento do app React Native otimizado para o mercado de Angola (<25MB, alta eficiência).

---

## 1. Build Android (Google Play Store AAB & APK Direto)

### Gerar Chave de Assinatura (Keystore de Produção)
```bash
keytool -genkeypair -v -keystore giro-release-key.keystore -alias giro-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Compilação Standalone via EAS Build
```bash
# Instalar CLI do EAS
npm install -g eas-cli

# Login na conta
eas login

# Build do pacote de produção (Android App Bundle - AAB para a Play Store)
eas build --platform android --profile production

# Build do APK direto para testes locais em Luanda
eas build --platform android --profile preview
```

---

## 2. Build iOS (Apple App Store / TestFlight)

```bash
# Build do pacote IPA para iOS
eas build --platform ios --profile production
```

---

## 3. Otimizações para Angola Aplicadas no Bundle
- **Tamanho Final**: < 22MB.
- **Cache Offline de Tiles OSM**: Reduz 85% do tráfego de dados de mapas.
- **GPS Throttled**: 6 segundos de intervalo para preservar bateria em aparelhos Android com 2GB-3GB de RAM.
