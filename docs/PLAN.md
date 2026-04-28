# Plano de Implementação: Suporte a Multi-flow (Eco / Con)

**Objetivo:** Adicionar suporte a multi-flow no app de leads da Arautos Imobiliária. Cada "time" (flow) verá apenas seus próprios leads por padrão, mas poderá ver todos se quiser.

## Fases da Implementação (A ser executada após aprovação)

### 1. Atualização de Tipos e Queries (Backend/Dados)
- **Arquivo:** `src/integrations/supabase/types.ts`
  - Adicionar `flow_type: string | null` em `Row`, `Insert` e `Update` da tabela `leads`.
- **Arquivo:** `src/lib/leads-queries.ts`
  - Adicionar `flow_type: string | null` na interface `LeadRow`.
  - Adicionar o campo `flow_type` na função `normalizeLead`.

### 2. Contexto Global (Estado da Aplicação)
- **Novo Arquivo:** `src/lib/flow-context.tsx`
  - Criar o `FlowContext` com os estados possíveis: `'eco'`, `'con'` ou `'ALL'`.
  - Implementar persistência usando `localStorage` com a chave `'arautos_flow'`.
  - Exportar o hook personalizado `useFlow()`.

### 3. Componente de UI: App Shell
- **Arquivo:** `src/components/layout/AppShell.tsx`
  - Adicionar um `FlowSwitcher` no topo da sidebar e no header mobile.
  - O seletor terá opções para "Econômico", "Concept" e "Todos".
  - Exibir um badge colorido indicando o flow atual (ECO = amber/laranja, CON = blue/azul).

### 4. Atualização das Páginas (Frontend)
- **Páginas a serem alteradas:** 
  - `src/pages/Leads.tsx`
  - `src/pages/Pipeline.tsx`
  - `src/pages/Followups.tsx`
  - `src/pages/Overview.tsx`
- **Alterações:**
  - Importar o hook `useFlow()`.
  - Filtrar a lista de leads pelo flow ativo ANTES de aplicar quaisquer filtros locais das páginas.
  - Se o flow ativo for `'ALL'`, não aplicar filtro de flow.
  - Na página `Overview.tsx`, atualizar o título da página dinamicamente: "Visão geral — Econômico" ou "Visão geral — Concept" (ou sem sufixo se for Todos).

## Agentes Necessários para Implementação (Fase 2)
1. `backend-specialist`: Para atualizar tipos e queries do Supabase.
2. `frontend-specialist`: Para implementar o FlowContext, o FlowSwitcher no AppShell e as atualizações nas páginas.
3. `test-engineer`: Para garantir a execução de scripts de verificação (linting/build) após a implementação.
