

## Plan: Fix document filtering by org in Documentos page

### Problem
Documents are filtered by `documentos.orgao_id`, but many documents have `orgao_id = NULL` even though their associated processo belongs to an org (e.g., ORG02). The selected org is `015fad45-...` (ORG02) but all documents either belong to `b76a4b82-...` (ORG01) or have NULL orgao_id.

### Solution
Two-part fix:

#### 1. Edit `src/pages/Documentos.tsx` — filter via processo's org
Instead of filtering documents by their own `orgao_id`, first fetch processo IDs for the selected org, then filter documents by `processo_id` in that set (same pattern used in LotesGerados).

```tsx
const { data: documentos = [] } = useQuery({
  queryKey: ["documentos", selectedOrgId],
  queryFn: async () => {
    if (selectedOrgId) {
      // Get processo IDs for this org
      const { data: processoIds } = await supabase
        .from("processos")
        .select("id")
        .eq("orgao_id", selectedOrgId);
      if (!processoIds?.length) return [];
      const ids = processoIds.map(p => p.id);
      const { data } = await supabase
        .from("documentos")
        .select("*")
        .in("processo_id", ids)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
    // No org filter — show all
    const { data } = await supabase
      .from("documentos")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  },
});
```

#### 2. Backfill NULL orgao_id on existing documents (database migration)
Update documents that have NULL `orgao_id` but have a `processo_id` linked to a processo with an `orgao_id`:

```sql
UPDATE documentos d
SET orgao_id = p.orgao_id
FROM processos p
WHERE d.processo_id = p.id
  AND d.orgao_id IS NULL
  AND p.orgao_id IS NOT NULL;
```

### Files
- **Edit**: `src/pages/Documentos.tsx` — change query to filter via processo's org
- **Migration**: Backfill documents with correct orgao_id

