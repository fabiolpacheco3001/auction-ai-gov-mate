

## Plan: Add item move between lots in Lotes Gerados

### Overview
Add a "Mover" button per item row in the `LoteItemsTable` when the lote is not approved. Clicking it shows a Select dropdown with other non-approved lotes from the same processo. Moving persists to the database (updates `lotes_bens`, recalculates both lote prices).

### Changes

#### 1. Edit `src/components/lotes/LoteItemsTable.tsx`
- Add new optional props: `isApproved`, `otherLotes` (array of `{id, numero, categoria}`), and `onMoveItem` callback
- Add a new "Ações" column (last column) that only renders when `otherLotes` is provided and `isApproved` is false
- Each row gets a MoveRight button; clicking it shows a Select dropdown inline to pick the target lote
- When a target lote is selected, call `onMoveItem(bemId, targetLoteId)`
- Import `MoveRight` from lucide-react and `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` from ui

#### 2. Edit `src/pages/LotesGerados.tsx`
- Add a `handleMoveItem(bemId, fromLoteId, toLoteId)` async function that:
  1. Updates `lotes_bens` row: set `lote_id = toLoteId` where `bem_id = bemId` and `lote_id = fromLoteId`
  2. Recalculates `preco_sugerido` for both the source and target lotes (fetch bens for each, sum `quantidade * valor_sugerido`)
  3. Updates both lotes in the database
  4. Invalidates the `lotes-by-processo` query
- Pass to `LoteItemsTable`:
  - `isApproved={lote.status === "aprovado"}`
  - `otherLotes` = other non-approved lotes in the same processo group (excluding current lote)
  - `onMoveItem={(bemId, targetLoteId) => handleMoveItem(bemId, lote.id, targetLoteId)}`
- Import `MoveRight` icon

### Business rules
- Only non-approved lotes show the move action column
- Only non-approved lotes appear as move targets
- After move, both source and target lote prices are recalculated and persisted

### Files
- **Edit**: `src/components/lotes/LoteItemsTable.tsx` — add move UI + props
- **Edit**: `src/pages/LotesGerados.tsx` — add move handler + pass props

