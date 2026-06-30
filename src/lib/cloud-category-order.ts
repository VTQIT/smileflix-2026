/**
 * Local-only category order management.
 * 
 * All sync is removed - categories are stored locally in the browser.
 * This simplifies the app and removes external dependencies.
 */
import { getCategories, setCategories, type Category } from "./cms-storage";

/** Reorder local categories to match `orderedIds`, keeping any new ones at the end. */
export const applyOrderedIds = (orderedIds: string[]): Category[] => {
  const cats = getCategories();
  if (orderedIds.length === 0) return cats;
  const byId = new Map(cats.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const next: Category[] = [];
  for (const id of orderedIds) {
    const c = byId.get(id);
    if (c && !seen.has(id)) {
      next.push(c);
      seen.add(id);
    }
  }
  for (const c of cats) if (!seen.has(c.id)) next.push(c);
  // Re-normalize the order field to 0..N-1
  return next.map((c, i) => ({ ...c, order: i }));
};

/** Apply the given order locally (no cloud sync). */
export const pullCategoryOrder = async (email: string): Promise<boolean> => {
  if (!email) return false;
  
  // No cloud to pull from - just return success
  console.log('📁 Using local category order (no cloud sync)');
  return true;
};

/** Push order locally only (no cloud sync). */
export const pushCategoryOrder = async (email: string, orderedIds: string[]): Promise<void> => {
  if (!email) return;
  
  // Just apply locally, no cloud push
  applyOrderedIds(orderedIds);
  console.log('📁 Category order saved locally');
};

/** Update local category order and notify components. */
export const updateAndSyncCategoryOrder = async (email: string, orderedIds: string[]): Promise<void> => {
  const reordered = applyOrderedIds(orderedIds);
  setCategories(reordered);
  
  // Dispatch event to notify components
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: "smileflex_categories" }));
  } catch {
    window.dispatchEvent(new Event("storage"));
  }
  
  console.log('📁 Category order updated locally');
};

/** Get current category order as array of IDs */
export const getCurrentCategoryOrder = (): string[] => {
  return getCategories().map(c => c.id);
};