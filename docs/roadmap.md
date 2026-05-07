# Roadmap — Features Pendentes

> Atualizado em `2026-05-07` (sessão 3). Itens 1, 3, 4, 6, 7, 8 concluídos nesta sessão.

---

## Prioridade Média

### 1. Sincronização / Backup na nuvem

**O que:** backup do banco local em conta do usuário (iCloud / Google Drive / backend próprio)  
**Por que:** proteção contra perda de dados por troca de celular  
**Estratégia recomendada:** backup do arquivo SQLite completo como primeiro passo  
**Depende de:** expo-file-system + autenticação (Supabase ou Firebase Auth)

---

## Sugestões Futuras

Itens considerados valiosos mas sem prazo definido. Podem ser retomados se houver demanda.

**RIR / RPE por série** — campo opcional de esforço percebido (RIR 0–4 ou RPE 1–10) por série; impacto no schema: nova coluna em `series_registradas`

**Planejamento semanal** — definir quais treinos serão feitos em quais dias; requer novo modelo `PlanoSemanal` + `DiaTreino`

**Múltiplos perfis** — mais de uma pessoa usando o mesmo dispositivo; depende de `PerfilLocal` (já previsto no modelo de domínio original)

**Integração com HealthKit / Google Fit** — registrar treino concluído na saúde do dispositivo; depende de `expo-health` ou biblioteca nativa

---

## Fora do Escopo

Itens deliberadamente deixados de fora, revisáveis no futuro:

- Login e autenticação
- Backend próprio
- Versão web
- Edição de série já registrada (deletar e redigitar é suficiente por ora)
- Recursos sociais (compartilhar treino, seguir amigos)
- Integração com wearables (smartwatch, sensor de frequência cardíaca)
- Monetização
- Analytics de produto (Mixpanel, Amplitude)
- Fotos/vídeos de execução
