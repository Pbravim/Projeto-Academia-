# EAS Build — Como adicionar na fila

## Pré-requisitos

1. **Conta Expo** — acesse [expo.dev](https://expo.dev) e faça login ou crie uma conta.
2. **EAS CLI** instalado globalmente:
   ```bash
   npm install -g eas-cli
   ```
3. **Login no EAS CLI:**
   ```bash
   eas login
   ```
4. Certifique-se de estar na pasta do app:
   ```bash
   cd apps/mobile
   ```

---

## Perfis de build disponíveis

| Perfil        | Uso                                      | Saída             |
|---------------|------------------------------------------|-------------------|
| `development` | Dev client para testes locais            | `.ipa` / `.apk` internal |
| `preview`     | APK para distribuição interna (Android)  | `.apk`            |
| `production`  | Build de loja (autoIncrement de versão)  | `.aab` / `.ipa`   |

---

## Comandos

### Build de preview (Android APK — mais rápido para testar)
```bash
eas build --profile preview --platform android
```

### Build de development client
```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios

# Ambos
eas build --profile development --platform all
```

### Build de produção
```bash
# Android (gera .aab para Play Store)
eas build --profile production --platform android

# iOS (gera .ipa para App Store)
eas build --profile production --platform ios
```

---

## Acompanhando a fila

Após rodar o comando, o CLI exibe uma URL no terminal:
```
Build queued: https://expo.dev/accounts/<usuario>/projects/projeto-academia/builds/<build-id>
```

Acesse essa URL para ver o status em tempo real, logs e baixar o artefato quando pronto.

Alternativamente, liste os builds recentes:
```bash
eas build:list
```

---

## Baixando o artefato

Quando o build terminar, o CLI pergunta se deseja baixar automaticamente. Caso queira baixar depois:
```bash
eas build:download --id <build-id>
```

Ou acesse o dashboard em [expo.dev/accounts/\<usuario\>/projects/projeto-academia](https://expo.dev).

---

## Submit para a loja (após build de produção)

```bash
# Android (Play Store)
eas submit --profile production --platform android

# iOS (App Store Connect)
eas submit --profile production --platform ios
```

> Requer credenciais de loja configuradas. Na primeira execução o CLI guia o processo interativamente.

---

## Dicas

- **`--no-wait`** — envia para a fila e retorna sem aguardar o resultado:
  ```bash
  eas build --profile preview --platform android --no-wait
  ```
- **`--message`** — adiciona uma nota ao build (útil para identificar o motivo):
  ```bash
  eas build --profile preview --platform android --message "fix: sessao zombie"
  ```
- A versão do build é gerenciada remotamente (`appVersionSource: remote` no `eas.json`). Para produção, `autoIncrement: true` já incrementa o `versionCode`/`buildNumber` automaticamente a cada build.
- O `projectId` do app é `3c671665-21ac-45cd-b46c-2457a8787b56` (definido em `app.json`).
