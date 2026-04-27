## Plano: Controle de acesso por vigência do órgão e limite do Pacote de Processos

### Visão geral
Adicionar duas regras de uso ao sistema:
1. **Login bloqueado** quando o órgão do usuário estiver inativo ou fora da vigência (`data_inicio` / `data_termino`).
2. **Criação de novo processo bloqueada** (UI e API) quando o órgão atingir a quantidade do `pacote_processos`.

Super admins continuam sem restrições (não estão vinculados a um único órgão).

---

### 1. Bloqueio de login por vigência do órgão

**Onde:** `src/hooks/useAuth.tsx` — alterar `signIn` para validar o órgão **logo após** `signInWithPassword` ter sucesso.

Fluxo:
1. `signInWithPassword` com email/senha (mantido).
2. Se autenticado, verificar se o usuário é `super_admin` em `user_roles`. Se sim → permitir login.
3. Caso contrário, buscar `orgao_id` do usuário em `orgao_usuarios` (ativo).
4. Buscar `ativo`, `data_inicio`, `data_termino` em `orgaos`.
5. Validar:
   - `orgao.ativo === true`
   - `today >= data_inicio`
   - `data_termino` nulo **ou** `today <= data_termino`
6. Se qualquer condição falhar → `supabase.auth.signOut()` + retornar erro com a mensagem exata:
   > "Login não permitido!\nO órgão que seu usuário está associado não está ativo no momento. Para reativar o acesso renove sua assinatura junto ao suporte."

**UI (`src/pages/Login.tsx`):** exibir o `error` retornado preservando quebras de linha (`whitespace-pre-line` no `<p>` de erro) em vez do texto genérico atual quando vier essa mensagem específica.

---

### 2. Limite do Pacote de Processos

**Função utilitária nova** `src/lib/orgQuota.ts`:
- `checkOrgQuota(orgaoId): Promise<{ allowed: boolean; message?: string }>`
- Lê `pacote_processos`, `data_inicio` e `data_termino` em `orgaos`. Se `pacote_processos` nulo/0 → ilimitado (`allowed: true`).
- Conta processos do órgão (durante o período definido entre a data de início e de término do cadastro do órgão (para data de término nula considere a data atual) — confirmar com regra abaixo).
- Se `count >= pacote_processos` → bloqueia com a mensagem:
  > "A quantidade de processo atingiu o limite previsto no pacote deste Órgão. Para retomar a geração solicite renovação/aumento do seu pacote de uso junto ao suporte."

**A. UI — `src/pages/NovoProcesso.tsx`**
- Antes de iniciar o processamento (no início do handler que dispara o upload/classificação) chamar `checkOrgQuota(selectedOrgId)`.
- Se bloqueado: `toast.error(message)` e abortar (não classificar, não inserir).
- Em `src/pages/RevisaoLotes.tsx` (onde de fato o `processos.insert` acontece): revalidar a quota imediatamente antes do `.insert(...)` na linha ~180. Se bloqueado, `toast.error` e abortar (defesa em profundidade contra burlar o early-check).

**B. API — `supabase/functions/intake-items/index.ts`**
- Após validar o token e antes do `processos.insert` (linha ~377):
  - Buscar `pacote_processos`, `data_inicio` e `data_termino` do `tokenRow.orgao_id` em `orgaos`.
  - Se `pacote_processos` definido (>0), contar `processos` por `orgao_id` filtrando `created_at` entre `data_inicio` e `COALESCE(data_termino, now())`.
  - Se `count >= pacote_processos`, retornar **HTTP 403** com JSON:
    ```json
    { "error": "A quantidade de processo atingiu o limite previsto no pacote deste Órgão. Para retomar a geração solicite renovação/aumento do seu pacote de uso junto ao suporte." }
    ```
  - **Importante:** fazer essa verificação **antes** da chamada à IA, para não consumir créditos desnecessariamente.

> Observação sobre o escopo do contador: a contagem considera apenas os processos criados **dentro da vigência atual do órgão** (de `data_inicio` até `data_termino`, ou até a data atual quando `data_termino` for nulo). Toda a lógica fica centralizada em `checkOrgQuota` + edge function, em um único filtro reutilizável.

---

### Arquivos
- **Edit:** `src/hooks/useAuth.tsx` — validação de vigência pós-login.
- **Edit:** `src/pages/Login.tsx` — exibir mensagem multi-linha.
- **Create:** `src/lib/orgQuota.ts` — utilitário compartilhado.
- **Edit:** `src/pages/NovoProcesso.tsx` — checagem antes de processar.
- **Edit:** `src/pages/RevisaoLotes.tsx` — revalidação antes do insert.
- **Edit:** `supabase/functions/intake-items/index.ts` — bloqueio na API.

### Não muda
- Schema do banco (campos `ativo`, `data_inicio`, `data_termino`, `pacote_processos` já existem em `orgaos`).
- RLS, super admin, fluxo de classificação por IA.
