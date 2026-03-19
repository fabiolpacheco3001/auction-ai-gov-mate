

## Plan: Add loading state to Lotes Gerados page

### Overview
The `useQuery` hook on line 98 already returns an `isLoading` property, but it's not being destructured or used. Add a loading indicator while data is being fetched.

### Changes

#### Edit `src/pages/LotesGerados.tsx`
1. **Line 98**: Destructure `isLoading` from `useQuery`:
   ```tsx
   const { data: groups = [], isLoading } = useQuery<ProcessoGroup[]>({
   ```
2. **Import** `Loader2` from `lucide-react`
3. **Before the main content** (around where the groups are rendered), add a loading state check:
   ```tsx
   if (isLoading) {
     return (
       <div className="flex flex-col items-center justify-center py-24 gap-3">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-muted-foreground">Carregando dados...</p>
       </div>
     );
   }
   ```

### Files
- **Edit**: `src/pages/LotesGerados.tsx` — destructure `isLoading`, add spinning loader + message

