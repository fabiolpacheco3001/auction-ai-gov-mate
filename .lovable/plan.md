

## Plan: Lock org context to user's own org for non-super_admin users

### Problem
Currently, any user can see "Todos os Órgãos" or switch orgs freely. Only `super_admin` users should have this ability. Regular users (`org_admin`, `user`) must be locked to their own org.

### Changes

1. **`src/contexts/OrgContext.tsx`** -- After fetching orgaos, also fetch the user's role and org binding:
   - Query `user_roles` to check if user is `super_admin`
   - Query `orgao_usuarios` to get the user's `orgao_id`
   - If NOT super_admin: force `selectedOrgId` to the user's `orgao_id` (ignore localStorage), expose `isSuperAdmin: false`
   - If super_admin: keep current behavior (localStorage, null = all orgs), expose `isSuperAdmin: true`
   - Add `isSuperAdmin` to the context type so sidebar/header can conditionally show org selector

2. **`src/components/layout/AppSidebar.tsx`** -- Hide the "Seleção de Órgão" admin menu item (already behind `isSuperAdmin` from `useUserRole`, so no change needed here)

3. **`src/pages/SelecaoOrgao.tsx`** -- No changes needed (already behind `SuperAdminRoute`)

### Technical detail

In `OrgProvider`, after user is available:
```
// Fetch role + org binding in parallel
const [{ data: roles }, { data: orgUser }] = await Promise.all([
  supabase.from("user_roles").select("role").eq("user_id", user.id),
  supabase.from("orgao_usuarios").select("orgao_id").eq("user_id", user.id).eq("ativo", true).maybeSingle(),
]);
const isSuperAdmin = roles?.some(r => r.role === "super_admin") ?? false;

if (!isSuperAdmin && orgUser?.orgao_id) {
  setSelectedOrgId(orgUser.orgao_id);  // force lock
}
```

The context will also expose `isSuperAdmin` so UI components can hide org-switching controls for regular users.

