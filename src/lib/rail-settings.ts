// src/lib/rail-settings.ts

import { getCategories, type Category } from "./cms-storage";

export interface RailSettings {
  id: string;
  name: string;
  description: string | null;
  sort: "manual" | "alphabetical" | "newest" | "rating" | "random";
  limit: number | null;
  filterGenre: string | null;
  filterDecade: string | null;
  filterRating: number | null;
  filterContentRating: string | null;
  includeInactive: boolean;
  enabled: boolean;
  displayOnHome: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_RAIL_SETTINGS: RailSettings[] = [
  {
    id: '1',
    name: 'Trending Now',
    description: 'Most popular movies right now',
    sort: 'rating',
    limit: 10,
    filterGenre: null,
    filterDecade: null,
    filterRating: null,
    filterContentRating: null,
    includeInactive: false,
    enabled: true,
    displayOnHome: true,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Action Movies',
    description: 'High-octane action films',
    sort: 'newest',
    limit: 10,
    filterGenre: 'Action',
    filterDecade: null,
    filterRating: null,
    filterContentRating: null,
    includeInactive: false,
    enabled: true,
    displayOnHome: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Comedy Favorites',
    description: 'Laugh out loud comedies',
    sort: 'rating',
    limit: 10,
    filterGenre: 'Comedy',
    filterDecade: null,
    filterRating: null,
    filterContentRating: null,
    includeInactive: false,
    enabled: true,
    displayOnHome: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'New Releases',
    description: 'The latest movies added',
    sort: 'newest',
    limit: 10,
    filterGenre: null,
    filterDecade: null,
    filterRating: null,
    filterContentRating: null,
    includeInactive: false,
    enabled: true,
    displayOnHome: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const STORAGE_KEYS = {
  RAIL_SETTINGS: 'smileflex_rail_settings',
  RAIL_CACHE: 'smileflex_rail_cache',
} as const;

/** Validate that data is an array of RailSettings */
function isValidRailSettings(data: any): data is RailSettings[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  // Check if first item has required fields
  const first = data[0];
  return first && typeof first === 'object' && 'id' in first && 'name' in first;
}

/** Get all rail settings from local storage (sync) */
export function getRailSettings(): RailSettings[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RAIL_SETTINGS);
    if (!data) {
      // Initialize with defaults if not exists
      setRailSettings(DEFAULT_RAIL_SETTINGS);
      return DEFAULT_RAIL_SETTINGS;
    }
    
    const parsed = JSON.parse(data);
    
    // Validate the data
    if (isValidRailSettings(parsed)) {
      return parsed;
    } else {
      console.warn('Invalid rail settings data, resetting to defaults');
      setRailSettings(DEFAULT_RAIL_SETTINGS);
      return DEFAULT_RAIL_SETTINGS;
    }
  } catch (error) {
    console.warn('Error reading rail settings, using defaults:', error);
    // If there's an error, reset to defaults
    setRailSettings(DEFAULT_RAIL_SETTINGS);
    return DEFAULT_RAIL_SETTINGS;
  }
}

/** Save rail settings to local storage (sync) */
export function setRailSettings(settings: RailSettings[]): void {
  if (!Array.isArray(settings)) {
    console.warn('Attempted to save non-array rail settings, ignoring');
    return;
  }
  localStorage.setItem(STORAGE_KEYS.RAIL_SETTINGS, JSON.stringify(settings));
}

/** Get cached rail settings (sync) */
export function getCachedRailSettings(): RailSettings[] {
  return getRailSettings();
}

/** Fetch rail settings - returns Promise for compatibility */
export async function fetchRailSettings(): Promise<RailSettings[]> {
  return getRailSettings();
}

/** Fetch rail settings sync version */
export function fetchRailSettingsSync(): RailSettings[] {
  return getRailSettings();
}

/** Save rail settings - returns Promise for compatibility */
export async function saveRailSettings(settings: RailSettings[]): Promise<void> {
  setRailSettings(settings);
}

/** Save rail settings sync version */
export function saveRailSettingsSync(settings: RailSettings[]): void {
  setRailSettings(settings);
}

/** Get default rail settings */
export function getDefaultRailSettings(): RailSettings[] {
  return DEFAULT_RAIL_SETTINGS;
}

/** Get a rail setting by ID */
export function getRailSettingById(id: string): RailSettings | undefined {
  const settings = getRailSettings();
  if (!Array.isArray(settings)) return undefined;
  return settings.find(r => r.id === id);
}

/** Create a new rail setting */
export function createRailSetting(settings: Omit<RailSettings, 'id' | 'createdAt' | 'updatedAt'>): RailSettings {
  const all = getRailSettings();
  const now = new Date().toISOString();
  const newSetting: RailSettings = {
    ...settings,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(newSetting);
  setRailSettings(all);
  return newSetting;
}

/** Update a rail setting */
export function updateRailSetting(id: string, updates: Partial<Omit<RailSettings, 'id' | 'createdAt'>>): RailSettings | null {
  const all = getRailSettings();
  if (!Array.isArray(all)) return null;
  
  const index = all.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  all[index] = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  setRailSettings(all);
  return all[index];
}

/** Delete a rail setting */
export function deleteRailSetting(id: string): boolean {
  const all = getRailSettings();
  if (!Array.isArray(all)) return false;
  
  const filtered = all.filter(r => r.id !== id);
  if (filtered.length === all.length) return false;
  setRailSettings(filtered);
  return true;
}

/** Reorder rail settings */
export function reorderRailSettings(orderedIds: string[]): void {
  const all = getRailSettings();
  if (!Array.isArray(all)) return;
  
  const ordered = orderedIds
    .map(id => all.find(r => r.id === id))
    .filter((r): r is RailSettings => r !== undefined);
  
  const remaining = all.filter(r => !orderedIds.includes(r.id));
  const reordered = [...ordered, ...remaining];
  
  reordered.forEach((r, index) => {
    r.order = index;
  });
  
  setRailSettings(reordered);
}

/** Generate a unique ID */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/** Get rails that are enabled and should display on home */
export function getEnabledRails(): RailSettings[] {
  const settings = getRailSettings();
  if (!Array.isArray(settings)) {
    return [];
  }
  return settings
    .filter(r => r.enabled && r.displayOnHome)
    .sort((a, b) => a.order - b.order);
}

/** Get movies for a rail based on its settings */
export function getMoviesForRail(rail: RailSettings): any[] {
  // This would use your movie data from cms-storage
  // For now, return an empty array - you can implement filtering logic here
  return [];
}

/** Clear the rail cache */
export function clearRailCache(): void {
  localStorage.removeItem(STORAGE_KEYS.RAIL_CACHE);
}

/** Update rail cache with new data */
export function updateRailCache(data: any): void {
  localStorage.setItem(STORAGE_KEYS.RAIL_CACHE, JSON.stringify(data));
}

/** Reset rail settings to defaults */
export function resetRailSettings(): void {
  setRailSettings(DEFAULT_RAIL_SETTINGS);
  clearRailCache();
}