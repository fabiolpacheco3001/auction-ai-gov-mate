

## Problem

When creating org users, the system uses the provided email as the Supabase Auth email. Supabase Auth enforces email uniqueness, so creating two users with the same email fails. The user wants uniqueness only on the `login` field, keeping the email field but without restriction.

## Solution

### 1. Database Migration
- Add `email` column to `orgao_usuarios` table (to store the real email for reference)
- Add a unique constraint on `login` in `orgao_usuarios` to enforce login uniqueness

### 2. Edge Function `create-org-user`
- Instead of using the user-provided email for Supabase Auth, generate a synthetic auth email based on login: `{login}@alienagov.gov.br`
- This avoids Supabase Auth's email uniqueness constraint
- Store the real email in the `orgao_usuarios.email` column
- The login flow already tries `{login}@alienagov.gov.br` first, so authentication continues to work

### 3. Frontend Validation (`CadastroOrgaos.tsx`)
- Before submit, check if the login already exists in `orgao_usuarios` and show an error if duplicated
- Remove any email-based duplicate checks

### 4. Existing Users Display
- Where existing users are shown (edit mode table), display the email from `orgao_usuarios.email`

## Technical Flow

```text
User fills form: nome, email, login, senha
       ↓
Frontend validates login uniqueness against orgao_usuarios
       ↓
Edge function create-org-user:
  - Creates auth user with email = "{login}@alienagov.gov.br"
  - Inserts orgao_usuarios row with real email in new email column
       ↓
Login page: user types login → tries {login}@alienagov.gov.br → auth succeeds
```

