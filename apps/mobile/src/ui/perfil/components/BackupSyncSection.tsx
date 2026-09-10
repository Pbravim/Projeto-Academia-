import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';
import { type BackupSyncDependencies,useBackupSync } from '../hooks/useBackupSync';

export function BackupSyncSection({ backup }: { backup: BackupSyncDependencies }) {
  const c = useTheme();
  const t = useT();
  const styles = makeStyles(c);
  const { authenticated, email: accountEmail, busy, status, login, register, logout, syncNow } =
    useBackupSync(backup);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    if (mode === 'login') void login(email, password);
    else void register(email, password, name);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('perfil.backup.sectionLabel')}</Text>

      {authenticated ? (
        <View style={styles.card}>
          <Text style={styles.connected}>{t('perfil.backup.conectadoComo')}</Text>
          <Text style={styles.email}>{accountEmail}</Text>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable
            disabled={busy}
            onPress={() => { void syncNow(); }}
            style={({ pressed }) => [styles.primaryBtn, (pressed || busy) ? { opacity: 0.7 } : null]}
          >
            {busy ? <ActivityIndicator size="small" color={c.accentText} /> : <Text style={styles.primaryBtnText}>{t('perfil.backup.sincronizarAgora')}</Text>}
          </Pressable>
          <Pressable onPress={() => { void logout(); }} style={styles.linkBtn}>
            <Text style={styles.linkText}>{t('perfil.backup.sair')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.help}>{t('perfil.backup.help')}</Text>
          {mode === 'register' ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('perfil.backup.nomePlaceholder')}
              placeholderTextColor={c.inputPlaceholder}
              editable={!busy}
            />
          ) : null}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('perfil.backup.emailPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('perfil.backup.senhaPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            secureTextEntry
            editable={!busy}
          />
          {status ? <Text style={styles.error}>{status}</Text> : null}
          <Pressable
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [styles.primaryBtn, (!canSubmit || pressed) ? { opacity: 0.7 } : null]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={c.accentText} />
            ) : (
              <Text style={styles.primaryBtnText}>{mode === 'login' ? t('perfil.backup.entrar') : t('perfil.backup.criarConta')}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.linkBtn}>
            <Text style={styles.linkText}>
              {mode === 'login' ? t('perfil.backup.semConta') : t('perfil.backup.jaTemConta')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    section: { marginTop: 8 },
    label: {
      fontSize: 13, fontWeight: '700', color: c.textLabel,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
    },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder,
      padding: 16, gap: 10,
    },
    help: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    connected: { fontSize: 12, color: c.textMeta },
    email: { fontSize: 16, fontWeight: '700', color: c.textPrimary, marginBottom: 4 },
    status: { fontSize: 13, color: c.textSecondary },
    error: { fontSize: 13, color: c.error },
    input: {
      backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.inputText, fontSize: 15,
    },
    primaryBtn: {
      backgroundColor: c.accent, borderRadius: 12, paddingVertical: 13,
      alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    primaryBtnText: { color: c.accentText, fontWeight: '700', fontSize: 15 },
    linkBtn: { alignItems: 'center', paddingVertical: 6 },
    linkText: { color: c.accent, fontSize: 13, fontWeight: '600' },
  });
}
