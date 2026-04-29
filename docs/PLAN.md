# Plano de Implementação: Feature de Agendamento

**Objetivo:** Permitir a visualização de datas de agendamento (marcadas pelo chatbot na tabela `leads` coluna `agendamento`) no CRM da Arautos Imobiliária. 
Isso incluirá exibir o agendamento nos detalhes de cada lead e criar uma nova página de "Agenda" com um calendário mensal para visualização de todos os agendamentos.

## Fases da Implementação (A ser executada após aprovação)

### 1. Atualização de Tipos e Queries (Backend/Dados)
- **Arquivo:** `src/integrations/supabase/types.ts`
  - Adicionar a coluna `agendamento: string | null` em `Row`, `Insert` e `Update` da tabela `leads`.
- **Arquivo:** `src/lib/leads-queries.ts`
  - Adicionar `agendamento: string | null` na interface `LeadRow`.
  - Mapear a data para um formato que possa ser usado no calendário.

### 2. Atualização dos Detalhes do Lead (Frontend/UI)
- **Componente:** Componente que exibe os detalhes do lead (dentro de `Leads.tsx` ou similar).
  - Incluir uma seção de "Agendamento".
  - Mostrar a data marcada pelo cliente de forma amigável.
  - Se o lead não tiver agendamento, ocultar a seção ou mostrar "Não agendado".

### 3. Nova Página de Agenda (Frontend/UI)
- **Novo Arquivo:** `src/pages/Agenda.tsx`
  - Criar uma interface com um calendário exibindo todos os dias do mês atual.
  - Filtrar e destacar os dias que possuem agendamentos.
  - Ao clicar num dia específico, abrir um detalhe/modal mostrando a lista dos leads agendados para aquele dia.
  - A interface deve ser 100% responsiva.
- **Rotas:** Adicionar a rota `/agenda` no `src/App.tsx`.
- **Menu Lateral:** Adicionar o link "Agenda" no componente `src/components/layout/AppShell.tsx` utilizando um ícone (ex: `CalendarDays` do lucide-react).

## Agentes Necessários para Implementação (Fase 2)
1. `backend-specialist`: Para atualizar tipos e queries do Supabase, incluindo o suporte à coluna `agendamento`.
2. `frontend-specialist`: Para implementar a exibição do agendamento nos detalhes do lead, criar a nova página responsiva `Agenda.tsx`, e atualizar o `AppShell` e roteamento.
3. `test-engineer`: Para rodar linting, checagem de tipos e garantir a responsividade e a corretude do novo recurso.
