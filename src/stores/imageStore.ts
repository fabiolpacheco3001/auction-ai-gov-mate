// Module-level store to pass File objects between pages (not serializable in router state)
let _imageMap = new Map<string, File>();

export const imageStore = {
  set(map: Map<string, File>) {
    _imageMap = map;
  },
  get(tombamento: string): File | undefined {
    return _imageMap.get(tombamento);
  },
  getAll(): Map<string, File> {
    return _imageMap;
  },
  clear() {
    _imageMap = new Map();
  },
};
