# Plano: Melhoria UX Contato e Design Beige

## 1. Visão Geral
O objetivo deste plano é atender aos dois requisitos principais levantados pelo usuário:
1. **Facilidade em marcar contato**: Adicionar um botão direto para marcar o lead como "Contatado" nas visualizações, registrando **quem** fez a marcação.
2. **Atualização Visual**: Mudar a paleta monocromática atual (Nike-minimal) para uma paleta com fundo bege claro e bordas/textos escuros, preservando uma estética limpa, moderna e elegante.
3. A lógica atual de gerenciamento de contatos não será alterada.

---

## 2. Tarefas e Quebra de Implementação (Task Breakdown)

### 2.1 Backend / Banco de Dados (Supabase)
- **Migração SQL**: Criar uma nova migração adicionando a coluna `last_contacted_by` (UUID ou string) à tabela `leads`. Adicionar também `last_contacted_by_email` se for mais fácil para visualização rápida sem join.
  - Ex: `ALTER TABLE public.leads ADD COLUMN last_contacted_by uuid REFERENCES auth.users(id);`
  - Ex: `ALTER TABLE public.leads ADD COLUMN last_contacted_by_email text;`
- **Atualizar Queries**: Modificar o frontend (`src/lib/leads-queries.ts`) para que a mutation `useMarkContacted` envie o email/ID do usuário logado ao marcar como contatado. (Obtido via `useAuth()`).

### 2.2 Alterações Visuais e Design System
- **Modificar `index.css`**: Alterar as variáveis do tema no `:root` e `.dark` (se aplicável), introduzindo os tons de bege/creme:
  - Fundo principal bege claro (`--background`, `--card`, `--popover`).
  - Tons contrastantes escuros (quase preto ou marrom ultra escuro) para textos (`--foreground`) e bordas (`--border`).
  - Reajustar cores de status (`--status-cold`, etc.) se necessário para combinarem com o fundo bege de maneira harmoniosa.

### 2.3 Melhorias na Interface e UX
- **Lista de Leads (`Leads.tsx`)**:
  - Extrair o botão "Marcar como contatado" de dentro do `RowActions` (menu de 3 pontinhos).
  - Adicionar um botão direto "Contatar" ou um ícone visualmente óbvio (como um "check" 🟢 ou "Marcar") na própria linha do Desktop e no card Mobile.
- **Painel lateral do Lead (`LeadDrawer.tsx`)**:
  - Exibir **quem** contatou o lead pela última vez ("Último contato por: joao@imobiliaria.com").
  - Dar mais destaque visual à ação de registrar contato.

---

## 3. Arquivos Envolvidos
- `supabase/migrations/XXXXXXXX_add_contacted_by.sql` (Novo)
- `src/lib/leads-queries.ts`
- `src/index.css`
- `src/pages/Leads.tsx`
- `src/pages/Followups.tsx`
- `src/components/leads/LeadDrawer.tsx`

---

## 4. Agentes Atribuídos
- `backend-specialist`: Para criação das migrações SQL no Supabase.
- `frontend-specialist`: Para as mudanças nos componentes React, implementação do botão rápido de contato e integração com hooks do Supabase.
- `frontend-design`: (Em conjunto com especialista frontend) Para refinamento das cores e design no Tailwind, aplicando o esquema fundo bege / bordas escuras.

---

## 5. Próximos Passos (Verification Checklist)
- Revisar se os tons de bege aplicados entregam o contraste desejado sem perder a legibilidade.
- Testar se o clique no botão atualiza corretamente local e banco.
- Conferir se o login de quem alterou foi registrado no banco de dados com sucesso.
