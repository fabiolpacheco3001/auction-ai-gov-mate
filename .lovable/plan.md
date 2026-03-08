

## Plan: Add image thumbnails to Lotes Gerados

### Overview
Add `imagem_url` to the `Bem` interface, show thumbnails in both the items table and the lote card header, with click-to-open behavior.

### Changes

#### 1. `src/pages/LotesGerados.tsx`
- Add `imagem_url` to the `Bem` interface (line 46-59): `imagem_url: string | null;`
- In the bensMap building (line 134), include `imagem_url: b.imagem_url ?? null`
- In each lote card (line 393-434), before the "Preço sugerido" div, add a thumbnail grid:
  - Collect up to 4 bens with `imagem_url` from `lote.bens`
  - Render a 2x2 grid (40x40px container) with tiny thumbnails
  - On click (stopPropagation), open a new tab/window showing all images for that lote
  - If no images, show nothing (or a subtle placeholder)

#### 2. `src/components/lotes/LoteItemsTable.tsx`
- Add `imagem_url: string | null` to the `Bem` interface
- Add a new column "Foto" after Tombamento in the table header
- In each row, if `item.imagem_url` exists, render a small thumbnail (32x32) as an `<a href={item.imagem_url} target="_blank">` wrapping an `<img>`; otherwise show "—"

#### 3. New page: `src/pages/LoteImagens.tsx`
- A simple page that receives lote images via URL query params or route state
- Actually, simpler approach: on click of the thumbnail grid, open a new window with a simple HTML page listing all images. We can use `window.open` with a blob URL or just navigate to a route.
- Best approach: create a route `/lote-imagens/:loteId` that fetches bens for that lote and displays all images in a grid. Add this route to App.tsx.

### Files
- **Edit**: `src/pages/LotesGerados.tsx` — add `imagem_url` to Bem, add thumbnail grid to lote cards
- **Edit**: `src/components/lotes/LoteItemsTable.tsx` — add `imagem_url` to Bem, add Foto column
- **Create**: `src/pages/LoteImagens.tsx` — full-page image gallery for a lote
- **Edit**: `src/App.tsx` — add `/lote-imagens/:loteId` route

