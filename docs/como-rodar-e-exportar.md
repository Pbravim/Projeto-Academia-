# Como Rodar e Exportar o App

## Requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- [npm](https://www.npmjs.com) (já incluído com o Node)
- Conta no [Expo](https://expo.dev) (necessária apenas para build em nuvem)
- [EAS CLI](https://docs.expo.dev/eas/) (necessário apenas para exportar o app)

---

## Rodar em Desenvolvimento

### 1. Instalar dependências

Na raiz do repositório:

```bash
npm install
```

### 2. Iniciar o servidor Expo

```bash
npm run mobile:start
```

O terminal exibe um QR code e um menu de opções.

### 3. Abrir no dispositivo

**Pelo celular (Android ou iOS):**

1. Instale o [Expo Go](https://expo.dev/go) no celular.
2. Escaneie o QR code exibido no terminal com o aplicativo Expo Go.

**Pelo emulador Android:**

1. Tenha o Android Studio instalado com um AVD configurado.
2. Com o emulador aberto, pressione `a` no terminal.

**Pelo simulador iOS (macOS apenas):**

1. Tenha o Xcode instalado.
2. Pressione `i` no terminal.

---

## Exportar como APK ou IPA (Build de Produção)

O projeto usa [EAS Build](https://docs.expo.dev/build/introduction/), o serviço de build em nuvem do Expo. Não é necessário ter Android Studio ou Xcode instalados para gerar o APK ou IPA.

### 1. Instalar o EAS CLI

```bash
npm install -g eas-cli
```

### 2. Fazer login na conta Expo

```bash
eas login
```

### 3. Entrar na pasta do app

```bash
cd apps/mobile
```

### 4. Configurar o EAS (apenas na primeira vez)

```bash
eas build:configure
```

Isso gera o arquivo `eas.json` com os perfis de build. Confirme as opções padrão.

---

### Gerar APK para Android

Um APK pode ser instalado diretamente em qualquer dispositivo Android sem precisar de conta na Play Store.

```bash
eas build --platform android --profile preview
```

O build roda na nuvem. Ao terminar, o EAS exibe um link para baixar o `.apk`. Transfira o arquivo para o celular e instale.

> Para instalar um APK manualmente, ative **"Fontes desconhecidas"** nas configurações de segurança do Android.

---

### Gerar AAB para publicar na Play Store

```bash
eas build --platform android --profile production
```

Isso gera um `.aab` (Android App Bundle), o formato exigido pela Google Play. Suba o arquivo pelo [Google Play Console](https://play.google.com/console).

---

### Gerar IPA para iOS

Requer uma conta no [Apple Developer Program](https://developer.apple.com/programs/) (paga, US$ 99/ano).

```bash
eas build --platform ios --profile production
```

O EAS solicita as credenciais da conta Apple durante o processo. Ao terminar, o arquivo `.ipa` pode ser enviado para a App Store pelo [Transporter](https://apps.apple.com/app/transporter/id1450874784) ou pelo [App Store Connect](https://appstoreconnect.apple.com).

---

### Testar o IPA sem publicar (TestFlight)

1. Gere o build com o perfil `production`.
2. Faça upload do `.ipa` no App Store Connect.
3. Distribua via TestFlight para os testadores.

---

## Referência de Comandos

| Ação | Comando |
|---|---|
| Instalar dependências | `npm install` (raiz) |
| Iniciar dev server | `npm run mobile:start` |
| Rodar testes | `npm run mobile:test` |
| Verificar tipos | `npm run mobile:typecheck` |
| Build Android (APK) | `eas build --platform android --profile preview` |
| Build Android (Play Store) | `eas build --platform android --profile production` |
| Build iOS (App Store) | `eas build --platform ios --profile production` |
| Ver status dos builds | `eas build:list` |
