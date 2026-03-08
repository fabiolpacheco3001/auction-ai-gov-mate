

## Plan: Add hover preview for image thumbnails in LoteItemsTable

### Change

**Edit `src/components/lotes/LoteItemsTable.tsx`**

Wrap the thumbnail `<img>` in a `HoverCard` from Radix UI. On hover, show a larger version of the image (256x256) in a `HoverCardContent` popover.

- Import `HoverCard`, `HoverCardTrigger`, `HoverCardContent` from `@/components/ui/hover-card`
- Replace the current `<a>` wrapping the thumbnail (lines 112-115) with:
  ```tsx
  <HoverCard>
    <HoverCardTrigger asChild>
      <a href={item.imagem_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        <img src={item.imagem_url} alt={item.descricao} className="w-8 h-8 rounded object-cover inline-block hover:opacity-80 transition-opacity" loading="lazy" />
      </a>
    </HoverCardTrigger>
    <HoverCardContent className="w-64 p-1" side="right">
      <img src={item.imagem_url} alt={item.descricao} className="w-full h-auto rounded object-contain" />
    </HoverCardContent>
  </HoverCard>
  ```

### Files
- **Edit**: `src/components/lotes/LoteItemsTable.tsx` — add HoverCard import + wrap thumbnail

