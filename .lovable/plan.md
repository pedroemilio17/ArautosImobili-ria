## 1. Lógica de status de contato (derivada no frontend)

Função pura `getContactStatus(lead)` aplicada na leitura. Avalia em ordem de prioridade — o primeiro match vence:

```text
1. ABANDONADO   → classificacao == "ABANDONOU"
2. ATRASADO     → proximo_contato existe E proximo_contato < agora
3. EM_FOLLOWUP  → proximo_contato existe E proximo_contato >= agora
4. CONTATADO    → tentativas_followup > 0
5. NAO_CONTATADO → caso padrão (tentativas_followup = 0, sem agenda)
```

**Por que essa ordem:** ABANDONADO sobrepõe tudo (lead descartado). ATRASADO é mais urgente que EM_FOLLOWUP. Quem tem agenda futura está em follow-up ativo, mesmo que já tenha sido contatado antes. CONTATADO sem agenda futura significa "já falei, sem próximo passo". NAO_CONTATADO é o default operacional crítico.

**Cores fixas (paleta Nike-minimal):**
| Status         | Badge        | Hex        |
|----------------|--------------|------------|
| NAO_CONTATADO  | Preto        | #000000    |
| CONTATADO      | Verde        | #16a34a    |
| EM_FOLLOWUP    | Amarelo      | #eab308    |
| ATRASADO       | Vermelho     | #dc2626    |
| ABANDONADO     | Cinza        | #9ca3af    |

**Normalização de strings:** todos os campos texto vindos do banco passam por `clean(s)` que remove aspas duplas, vírgulas finais e espaços. Aplica a `classificacao`, `etapa_que_parou`, `finalidade`, etc., antes de qualquer comparação ou exibição.

---

## 2. Estrutura das telas

### Login (`/login`)
Email + senha. Sem signup público. Usuários admin criados manualmente no Supabase.

### Visão Geral (`/`) — foco em contato
- **6 KPI cards** (linha responsiva 2/3/6 colunas):
  Total · Não contatados · Contatados · Em follow-up · Atrasados · QUENTES
- **Gráfico pizza:** distribuição por status de contato (5 fatias)
- **Gráfico barras:** leads por `etapa_que_parou` (abertura, situação, dados, completo, …)
- **Gráfico linha:** novos leads por dia (últimos 30 dias, baseado em `created_at`)
- **Lista "Próximos contatos":** próximos 7 dias, ordenado por `proximo_contato`. Atrasados aparecem no topo com tarja vermelha.

### Leads (`/leads`) — operacional
- **Filtros (chips no topo):** Status de contato (principal, com contagem em cada chip) · Classificação · Etapa · Período (created_at)
- **Busca:** nome ou WhatsApp
- **Tabela:** Nome · WhatsApp (botão wa.me) · Status (badge forte) · Classificação · Etapa · Próximo contato · Tentativas · Ações
- **Ações rápidas por linha (menu …):**
  - "Marcar como contatado" → incrementa `tentativas_followup` e atualiza `updated_at`
  - "Definir próximo contato" → mini date+time picker em popover, grava `proximo_contato`
  - "Abrir detalhe" → drawer lateral com todos os campos (perfil, contexto, financiamento, observações, LEAD_RAW colapsável) + edição de `classificacao`, `proximo_passo`, `observacoes`

### Pipeline (`/pipeline`) — Kanban
Colunas dinâmicas a partir dos valores distintos de `etapa_que_parou` (na ordem: abertura → situação → dados → completo → outros). Cards mostram:
- Nome (bold)
- Badge de status de contato
- Badge de classificação
- "Próx: dd/mm HH:mm" se houver `proximo_contato`

Drag-and-drop entre colunas → UPDATE em `etapa_que_parou`. Optimistic update via TanStack Query.

### Follow-ups (`/followups`)
3 seções empilhadas:
- **Atrasados** — fundo vermelho-claro, ordem por mais antigo primeiro
- **Hoje**
- **Próximos dias** (até 14 dias à frente)

Cada item: nome, WhatsApp (botão wa.me), próximo contato, classificação, tentativas. Botão primário **"Contatei"** → incrementa `tentativas_followup`, atualiza `updated_at`, e abre popover opcional para definir o próximo `proximo_contato`.

### Layout global
Sidebar fixa à esquerda (collapsa em mobile para top-bar com menu): logo, Visão Geral, Leads, Pipeline, Follow-ups, e no rodapé email do usuário + Sair.

---

## 3. Wireframe (visual)

### Visão Geral

```text
┌─────────────────────────────────────────────────────────────────┐
│ ECO · Dashboard                              admin@eco  [Sair]  │
├──────────┬──────────────────────────────────────────────────────┤
│          │  Visão geral                                          │
│ ◼ Visão  │                                                       │
│   Leads  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│   Pipe.. │  │ 18 │ │  9 │ │  6 │ │  2 │ │  1 │ │  7 │           │
│   F-ups  │  │Tot │ │Não │ │Cont│ │F-up│ │Atr.│ │QNT │           │
│          │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘           │
│          │                                                       │
│          │  ┌─────────────┐  ┌───────────────────────────────┐  │
│          │  │  Status     │  │  Etapa do funil               │  │
│          │  │  ◐ pizza    │  │  ▆ ▅ ▃ ▂ ▁                    │  │
│          │  └─────────────┘  └───────────────────────────────┘  │
│          │                                                       │
│          │  ┌──────────────────────────────────────────────┐    │
│          │  │  Novos leads / dia (30d)   ╱╲  ╱╲╱╲          │    │
│          │  └──────────────────────────────────────────────┘    │
│          │                                                       │
│          │  Próximos contatos                                    │
│          │  ▌ ATRASADO  Márcio        há 2d   [WhatsApp]        │
│          │    HOJE      Xandy         15:00   [WhatsApp]        │
│          │    AMANHÃ    Julliette     10:30   [WhatsApp]        │
└──────────┴──────────────────────────────────────────────────────┘
```

### Leads

```text
Leads                                                  [Buscar nome/whatsapp]
[ Todos 18 ] [ Não contatado 9 ] [ Contatado 6 ] [ Em F-up 2 ] [ Atrasado 1 ]
Classificação ▾   Etapa ▾   Período ▾                            [Limpar]

┌────────────────────────────────────────────────────────────────────────┐
│ Nome      │ WhatsApp     │ Status        │ Class. │ Etapa   │ Próx.   │
├────────────────────────────────────────────────────────────────────────┤
│ José N.   │ [55 65 …] ↗ │ ● NÃO CONT.   │ QUENTE │ dados   │   —     │
│ Márcio    │ [55 62 …] ↗ │ ● ATRASADO    │ QUENTE │ situação│ -2d     │
│ Xandy     │ [55 54 …] ↗ │ ● EM FOLLOW-UP│ QUENTE │ completo│ hoje    │
│ Jackson   │ [55 65 …] ↗ │ ● CONTATADO   │ MORNO  │ abertura│   —     │
└────────────────────────────────────────────────────────────────────────┘
```

### Pipeline

```text
ABERTURA (4)        SITUAÇÃO (5)        DADOS (3)         COMPLETO (2)
┌──────────────┐    ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│ Jackson      │    │ Márcio       │    │ José Nilton  │  │ Xandy        │
│ ● CONTATADO  │    │ ● ATRASADO   │    │ ● NÃO CONT.  │  │ ● EM F-UP    │
│ MORNO        │    │ QUENTE       │    │ QUENTE       │  │ QUENTE       │
│              │    │ Próx: -2d    │    │              │  │ Próx: hoje   │
└──────────────┘    └──────────────┘    └──────────────┘  └──────────────┘
```

### Follow-ups

```text
ATRASADOS (1)
▌ Márcio   55 65 9115-9080   há 2 dias      QUENTE   3x    [Contatei] [WhatsApp]

HOJE (1)
  Xandy    55 54 9145-7534   15:00          QUENTE   1x    [Contatei] [WhatsApp]

PRÓXIMOS DIAS (3)
  Julliette 55 65 8156-4951  amanhã 10:30   MORNO    0x    [Contatei] [WhatsApp]
  …
```

---

## 4. Detalhes técnicos

**Stack:** React + Vite + TS, Tailwind, shadcn/ui, TanStack Query, Recharts, Supabase JS, react-router-dom, date-fns (com locale pt-BR), `@dnd-kit/core` para Kanban.

**Design tokens (`index.css`):** redefinir HSL para tema claro Nike-minimal — `--background: 0 0% 100%`, `--foreground: 0 0% 0%`, `--muted: 0 0% 96%`, `--border: 0 0% 90%`, e adicionar tokens semânticos `--status-cold`, `--status-contacted`, `--status-followup`, `--status-late`, `--status-abandoned` mapeados às cores acima. Tipografia: Inter, peso 700 para títulos, tabular-nums em números. Border radius padrão `--radius: 0.375rem`.

**Auth & RLS:**
- Supabase Auth (email/senha) com `onAuthStateChange` antes de `getSession`
- Tabela `public.user_roles` (id, user_id, role enum `app_role` com `admin`)
- Função `public.has_role(_user_id uuid, _role app_role)` SECURITY DEFINER
- RLS habilitado em `public.leads` e `public.leads_dashboard`:
  - SELECT/UPDATE permitidos somente quando `has_role(auth.uid(), 'admin')`
- Sem signup público; primeiro admin é inserido via SQL.
- `CONCEPT.leadsCON` ignorada.

**Mutations (apenas em `public.leads`):**
- `marcarContatado(id)` → `UPDATE leads SET tentativas_followup = tentativas_followup + 1, updated_at = now()`
- `definirProximoContato(id, ts)` → `UPDATE leads SET proximo_contato = $ts, updated_at = now()`
- `atualizarEtapa(id, etapa)` → `UPDATE leads SET etapa_que_parou = $etapa, updated_at = now()`
- `atualizarCampos(id, patch)` → para classificação, próximo passo, observações

**Hooks/queries:**
- `useLeads(filters)` — fetch + normalização via `clean()` + cálculo de `contactStatus` no `select`
- `useLeadStats()` — agrega counts no client (18 registros é trivial)
- Invalidações: toda mutation invalida `["leads"]`

**Responsividade:** sidebar vira top-bar com Sheet em <md. Tabela vira cards empilhados em <sm. Kanban faz scroll horizontal em mobile.

**Estrutura de pastas:**
```text
src/
  pages/ Login.tsx, Overview.tsx, Leads.tsx, Pipeline.tsx, Followups.tsx
  components/
    layout/ Sidebar.tsx, AppShell.tsx, ProtectedRoute.tsx
    leads/ StatusBadge.tsx, ClassificationBadge.tsx, LeadDrawer.tsx,
           LeadsTable.tsx, NextContactPopover.tsx, WhatsAppButton.tsx
    pipeline/ KanbanBoard.tsx, KanbanCard.tsx
    overview/ KpiCard.tsx, StatusPie.tsx, FunnelBars.tsx, NewLeadsLine.tsx
  lib/
    contactStatus.ts  ← getContactStatus + STATUS_META (cor, label)
    normalize.ts      ← clean()
    queries.ts        ← hooks TanStack Query
  integrations/supabase/client.ts (já existe)
```

**Migração SQL única:** cria enum `app_role`, tabela `user_roles`, função `has_role`, habilita RLS em `leads` e `leads_dashboard` e cria policies SELECT/UPDATE para admin.

**Aviso de auth:** após a migração, é necessário criar pelo menos um usuário no Supabase Auth e inserir uma linha em `user_roles` com `role='admin'` para conseguir acessar o dashboard. Vou incluir o SQL de exemplo no final.
