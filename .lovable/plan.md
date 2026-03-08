

## Plan: Add "Ver Fotos" link on processo header + processo-level gallery page

### Changes

#### 1. Create `src/pages/ProcessoImagens.tsx`
- New page at route `/processo-imagens/:processoId`
- Fetches all lotes for the processo, then all bens with `imagem_url` across those lotes
- Displays images in a grid, each showing tombamento, description, and lote number
- Clicking an image opens the original in a new tab
- Back button returns to `/lotes`

#### 2. Edit `src/App.tsx`
- Import `ProcessoImagens` and add route: `<Route path="/processo-imagens/:processoId" element={<ProcessoImagens />} />`

#### 3. Edit `src/pages/LotesGerados.tsx` (lines 368-369)
- Add `Camera` icon import from lucide-react
- Below the lotes count `<span>` (line 369), add a "Ver Fotos" link:
  ```tsx
  <span
    className="text-xs text-accent hover:underline cursor-pointer flex items-center gap-1"
    onClick={(e) => { e.stopPropagation(); navigate(`/processo-imagens/${group.processo.id}`); }}
  >
    <Camera className="w-3 h-3" /> Ver Fotos
  </span>
  ```

### Files
- **Create**: `src/pages/ProcessoImagens.tsx`
- **Edit**: `src/App.tsx` — add route
- **Edit**: `src/pages/LotesGerados.tsx` — add "Ver Fotos" link + Camera import

