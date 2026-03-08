

## Plan: Store matched images in storage and link to bens

### Problem
Images matched by tombamento are tracked in client state but never uploaded to storage. The `bens` table has no column to store an image URL. We need a storage bucket, a new column on `bens`, and upload logic during the "Salvar Lotes" flow.

### Changes

#### 1. Database migration
- Add `imagem_url text` column to the `bens` table (nullable, default null)
- Create a storage bucket `bens-imagens` (public) for the uploaded images
- Add RLS policies on `storage.objects` for authenticated users to insert/select from the bucket

```sql
ALTER TABLE public.bens ADD COLUMN imagem_url text DEFAULT null;

INSERT INTO storage.buckets (id, name, public) VALUES ('bens-imagens', 'bens-imagens', true);

CREATE POLICY "Authenticated can upload bens images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bens-imagens');

CREATE POLICY "Anyone can view bens images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'bens-imagens');
```

#### 2. `src/pages/NovoProcesso.tsx`
- Currently passes `imageMap: Object.fromEntries(imageMap)` to navigation state, but `File` objects don't serialize via `Object.fromEntries` properly for navigation state
- Instead, store the actual `File` objects in a shared ref or pass them differently. Actually, `location.state` can hold serializable data only. We need to use a different approach.
- **Solution**: Use a module-level variable (or context) to hold the `Map<string, File>` between NovoProcesso and RevisaoLotes, since File objects can't be serialized in router state.

#### 3. `src/pages/RevisaoLotes.tsx` — `handleAprovar`
- After inserting bens and getting their IDs, iterate over each bem
- For each bem with a matched image (by tombamento), upload the File to `bens-imagens/{processo_id}/{bem_id}.{ext}`
- Get the public URL and update the bem's `imagem_url` column
- Use the imageMap passed from NovoProcesso

#### 4. Shared image store
- Create a simple module `src/stores/imageStore.ts` that exports `get/set` for a `Map<string, File>` to pass File objects between pages without serialization

### Files
- **Migration**: Add `imagem_url` column + storage bucket + policies
- **Create**: `src/stores/imageStore.ts`
- **Edit**: `src/pages/NovoProcesso.tsx` — store imageMap in shared store before navigating
- **Edit**: `src/pages/RevisaoLotes.tsx` — after inserting bens, upload images and update `imagem_url`

