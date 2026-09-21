# Guia de Compilação Local Offline: Android APK / TWA — GIRO Angola

Este documento descreve o procedimento para compilar os pacotes nativos Android (`.apk` para instalação direta e `.aab` para distribuição) **100% de forma local e offline** no seu computador, preservando total sigilo industrial e sem enviar código ou chaves para repositórios externos (`sem git push`).

---

## 1. Identificadores dos Pacotes Nativos

| Aplicação | Package Name | Ponto de Entrada PWA |
| :--- | :--- | :--- |
| **GIRO Passageiro** | `ao.gov.giro.app` | `https://giro-4ed50.web.app/passenger.html` (ou `index.html`) |
| **GIRO Motorista** | `ao.gov.giro.driver` | `https://giro-4ed50.web.app/driver.html` |

---

## 2. Pré-requisitos Locais na Máquina

1. **Node.js**: v18+ instalado.
2. **Java Development Kit (JDK)**: JDK 17 ou 21 (necessário para o Gradle e assinatura de chave).
3. **Android SDK / CLI**: Ferramentas de compilação locais.

---

## 3. Método Rápido e Oficial: Bubblewrap CLI (Google Chrome Labs)

O **Bubblewrap** é a ferramenta de referência da Google para transformar PWAs modernas em pacotes nativos Android com suporte total a:
- Ícones adaptativos / maskable (`icons/icon-512.png`).
- Notificações nativas e serviço em segundo plano.
- Geolocalização de alta precisão para Luanda e Angola.
- Remoção total da barra de endereço do navegador (ecrã completo nativo).

### Passo a Passo no Terminal PowerShell Local:

```powershell
# 1. Instalar a CLI do Bubblewrap globalmente (ou usar via npx)
npm install -g @bubblewrap/cli

# 2. Iniciar a inicialização do pacote do Passageiro (na pasta android/)
cd android
bubblewrap init --manifest="https://giro-4ed50.web.app/manifest.json"

# O assistente solicitará os dados locais (JDK e Android SDK serão autodetectados).
# Escolha a chave keystore local existente ou crie uma nova offline.

# 3. Gerar o ficheiro APK instalável (.apk) e o pacote de publicação (.aab)
bubblewrap build

# O resultado será gerado na pasta de saída local:
# -> app-release-signed.apk (instalação direta em qualquer telemóvel Android)
# -> app-release-bundle.aab
```

### Compilação do App do Motorista (GIRO Motorista Parceiro):

```powershell
# Inicializar com o manifest do condutor
bubblewrap init --manifest="https://giro-4ed50.web.app/manifest-driver.json"
bubblewrap build
```

---

## 4. Instalação e Teste Direto no Dispositivo via USB (ADB)

Com o telemóvel Android conectado em modo Depuração USB:

```powershell
adb install app-release-signed.apk
```

O aplicativo aparecerá com o ícone dourado/preto da GIRO, abrindo instantaneamente em modo tela cheia nativa.

---

## 5. Diretrizes de Segurança e Sigilo Absoluto

1. **Ficheiro `.keystore`**: Nunca partilhe a sua chave privada `.keystore` nem a envie para repositórios públicos.
2. **Compilação 100% Local**: O processo de compilação acima ocorre exclusivamente na máquina do desenvolvedor.
3. **Atualizações Transparentes**: Quaisquer correções efetuadas nos ficheiros HTML/JS locais refletem-se instantaneamente no aplicativo instalado graças ao Service Worker de controle unificado.
