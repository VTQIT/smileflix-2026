// src/lib/cms-storage.ts

import { api, Movie as ApiMovie, Category as ApiCategory, User as ApiUser } from './api';

export interface Movie {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  video: string;
  duration: number;
  categoryId: string;
  published: boolean;
  ads: string[];
  createdAt: string;
  year: number;
  rating: number;
  featured: boolean;
  badge: string;
  // New metadata fields
  genres?: string[];
  cast_list?: string[];
  director?: string;
  country?: string;
  language?: string;
  content_rating?: string;
  // Play tracking
  playCount?: number;
  lastPlayed?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  virtual?: boolean;
  icon?: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

const STORAGE_KEYS = {
  MOVIES: 'smileflex_movies',
  CATEGORIES: 'smileflex_categories',
  USERS: 'smileflex_users',
  CURRENT_USER: 'smileflex_current_user',
  PLAY_COUNTS: 'smileflex_play_counts',
  USE_API: 'smileflex_use_api', // Toggle between API and localStorage
} as const;

// Check if we should use API
const shouldUseApi = (): boolean => {
  try {
    const useApi = localStorage.getItem(STORAGE_KEYS.USE_API);
    // If not set, try to connect to API
    if (useApi === null) {
      // Check if API is available (async, will be checked later)
      return false; // Default to localStorage for backward compatibility
    }
    return useApi === 'true';
  } catch {
    return false;
  }
};

// Set to use API
export function setUseApi(use: boolean): void {
  localStorage.setItem(STORAGE_KEYS.USE_API, String(use));
}

// Check if API is available
let apiAvailable: boolean | null = null;

export async function checkApiAvailability(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3001/api/movies', {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000),
    });
    apiAvailable = response.ok;
    return apiAvailable;
  } catch {
    apiAvailable = false;
    return false;
  }
}

// ============ MOVIE FUNCTIONS ============

// Cache for API data
let movieCache: Movie[] = [];
let categoryCache: Category[] = [];

export function getMovies(): Movie[] {
  // If using API, return cached data or empty (data loaded async via useMovies hook)
  if (shouldUseApi()) {
    return movieCache;
  }
  // Fallback to localStorage
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MOVIES);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Async version for API
export async function fetchMovies(): Promise<Movie[]> {
  try {
    const data = await api.getMovies();
    movieCache = data;
    return data;
  } catch (error) {
    console.warn('Failed to fetch from API, using localStorage:', error);
    // Fallback to localStorage
    return getMovies();
  }
}

export function setMovies(movies: Movie[]): void {
  // Save to localStorage always (backup)
  localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
  
  // If using API, save to API as well
  if (shouldUseApi()) {
    movieCache = movies;
    // Async save to API
    api.saveMovie(movies).catch(console.error);
  }
}

// Async version for API
export async function saveMoviesToApi(movies: Movie[]): Promise<void> {
  try {
    for (const movie of movies) {
      await api.saveMovie(movie);
    }
    movieCache = movies;
    localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
  } catch (error) {
    console.error('Failed to save to API:', error);
    // Still save to localStorage as fallback
    localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
  }
}

export function getMovieById(id: string): Movie | undefined {
  return getMovies().find(m => m.id === id);
}

export async function getMovieByIdAsync(id: string): Promise<Movie | undefined> {
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    return movies.find(m => m.id === id);
  }
  return getMovies().find(m => m.id === id);
}

export function getMovieBySlug(slug: string): Movie | undefined {
  return getMovies().find(m => m.slug === slug);
}

export async function getMovieBySlugAsync(slug: string): Promise<Movie | undefined> {
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    return movies.find(m => m.slug === slug);
  }
  return getMovies().find(m => m.slug === slug);
}

export function getMoviesByCategory(categoryId: string): Movie[] {
  return getMovies().filter(m => m.categoryId === categoryId && m.published);
}

export async function getMoviesByCategoryAsync(categoryId: string): Promise<Movie[]> {
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    return movies.filter(m => m.categoryId === categoryId && m.published);
  }
  return getMovies().filter(m => m.categoryId === categoryId && m.published);
}

export function getFeaturedMovies(): Movie[] {
  return getMovies().filter(m => m.featured && m.published);
}

export async function getFeaturedMoviesAsync(): Promise<Movie[]> {
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    return movies.filter(m => m.featured && m.published);
  }
  return getMovies().filter(m => m.featured && m.published);
}

export function searchMovies(query: string): Movie[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  return getMovies().filter(m => {
    const titleMatch = m.title.toLowerCase().includes(q);
    const descMatch = m.description.toLowerCase().includes(q);
    const genreMatch = m.genres?.some(g => g.toLowerCase().includes(q));
    const castMatch = m.cast_list?.some(c => c.toLowerCase().includes(q));
    const directorMatch = m.director?.toLowerCase().includes(q);
    
    return titleMatch || descMatch || genreMatch || castMatch || directorMatch;
  });
}

export async function searchMoviesAsync(query: string): Promise<Movie[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    return movies.filter(m => {
      const titleMatch = m.title.toLowerCase().includes(q);
      const descMatch = m.description.toLowerCase().includes(q);
      const genreMatch = m.genres?.some(g => g.toLowerCase().includes(q));
      const castMatch = m.cast_list?.some(c => c.toLowerCase().includes(q));
      const directorMatch = m.director?.toLowerCase().includes(q);
      return titleMatch || descMatch || genreMatch || castMatch || directorMatch;
    });
  }
  return searchMovies(query);
}

export function getMoviesByGenre(genre: string): Movie[] {
  const g = genre.toLowerCase().trim();
  if (!g) return [];
  
  return getMovies().filter(m => 
    m.genres?.some(genre => genre.toLowerCase() === g)
  );
}

export async function getMoviesByGenreAsync(genre: string): Promise<Movie[]> {
  const g = genre.toLowerCase().trim();
  if (!g) return [];
  
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    return movies.filter(m => 
      m.genres?.some(genre => genre.toLowerCase() === g)
    );
  }
  return getMoviesByGenre(genre);
}

// ============ PLAY COUNT FUNCTIONS ============

export function getPlayCounts(): Record<string, number> {
  // If using API, get from cached movies
  if (shouldUseApi()) {
    const counts: Record<string, number> = {};
    movieCache.forEach(m => {
      if (m.playCount) counts[m.id] = m.playCount;
    });
    return counts;
  }
  
  // Fallback to localStorage
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLAY_COUNTS);
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function setPlayCounts(counts: Record<string, number>): void {
  localStorage.setItem(STORAGE_KEYS.PLAY_COUNTS, JSON.stringify(counts));
}

export function incrementPlayCount(movieId: string): number {
  // Increment in API if available
  if (shouldUseApi()) {
    api.incrementPlayCount(movieId).then(() => {
      // Refresh cache
      fetchMovies().catch(console.error);
    }).catch(console.error);
  }
  
  // Also update localStorage
  const counts = getPlayCounts();
  const current = counts[movieId] || 0;
  counts[movieId] = current + 1;
  setPlayCounts(counts);
  
  // Also update the movie's playCount field for caching
  const movies = getMovies();
  const movie = movies.find(m => m.id === movieId);
  if (movie) {
    movie.playCount = counts[movieId];
    movie.lastPlayed = new Date().toISOString();
    setMovies(movies);
  }
  
  return counts[movieId];
}

export async function incrementPlayCountAsync(movieId: string): Promise<number> {
  try {
    if (shouldUseApi()) {
      const result = await api.incrementPlayCount(movieId);
      await fetchMovies(); // Refresh cache
    }
  } catch (error) {
    console.warn('Failed to increment play count via API:', error);
  }
  
  // Always update localStorage
  const counts = getPlayCounts();
  const current = counts[movieId] || 0;
  counts[movieId] = current + 1;
  setPlayCounts(counts);
  
  const movies = getMovies();
  const movie = movies.find(m => m.id === movieId);
  if (movie) {
    movie.playCount = counts[movieId];
    movie.lastPlayed = new Date().toISOString();
    setMovies(movies);
  }
  
  return counts[movieId];
}

export function getLastPlayed(movieId: string): string | null {
  const movies = getMovies();
  const movie = movies.find(m => m.id === movieId);
  return movie?.lastPlayed || null;
}

export function getPlayCount(movieId: string): number {
  const counts = getPlayCounts();
  return counts[movieId] || 0;
}

// ============ RANKING FUNCTIONS ============

export function rankTopTen(limit: number = 10): Movie[] {
  const movies = getMovies().filter(m => m.published);
  const counts = getPlayCounts();
  
  // Sort by play count (descending)
  const sorted = [...movies].sort((a, b) => {
    const aCount = counts[a.id] || 0;
    const bCount = counts[b.id] || 0;
    return bCount - aCount;
  });
  
  return sorted.slice(0, limit);
}

export async function rankTopTenAsync(limit: number = 10): Promise<Movie[]> {
  if (shouldUseApi()) {
    const movies = await fetchMovies();
    const published = movies.filter(m => m.published);
    const sorted = [...published].sort((a, b) => {
      const aCount = a.playCount || 0;
      const bCount = b.playCount || 0;
      return bCount - aCount;
    });
    return sorted.slice(0, limit);
  }
  return rankTopTen(limit);
}

export function getMostPlayed(limit: number = 10): Movie[] {
  return rankTopTen(limit);
}

// ============ CATEGORY FUNCTIONS ============

export function getCategories(): Category[] {
  // If using API, return cached data
  if (shouldUseApi() && categoryCache.length > 0) {
    return categoryCache;
  }
  
  // Fallback to localStorage
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) return getDefaultCategories();
    return JSON.parse(data);
  } catch {
    return getDefaultCategories();
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const data = await api.getCategories();
    categoryCache = data;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Failed to fetch categories from API:', error);
    return getCategories();
  }
}

export function setCategories(categories: Category[]): void {
  // Save to localStorage
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  
  // If using API, save to API as well
  if (shouldUseApi()) {
    categoryCache = categories;
    api.saveCategories(categories).catch(console.error);
  }
}

export async function saveCategoriesToApi(categories: Category[]): Promise<void> {
  try {
    await api.saveCategories(categories);
    categoryCache = categories;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (error) {
    console.error('Failed to save categories to API:', error);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }
}

function getDefaultCategories(): Category[] {
  return [
    { id: '1', name: 'Trending', slug: 'trending', order: 0 },
    { id: '2', name: 'Action', slug: 'action', order: 1 },
    { id: '3', name: 'Comedy', slug: 'comedy', order: 2 },
    { id: '4', name: 'Drama', slug: 'drama', order: 3 },
    { id: '5', name: 'Sci-Fi', slug: 'sci-fi', order: 4 },
    { id: '6', name: 'Horror', slug: 'horror', order: 5 },
    { id: '7', name: 'Animation', slug: 'animation', order: 6 },
    { id: '8', name: 'Romance', slug: 'romance', order: 7 },
  ];
}

export function getCategoryById(id: string): Category | undefined {
  return getCategories().find(c => c.id === id);
}

export async function getCategoryByIdAsync(id: string): Promise<Category | undefined> {
  if (shouldUseApi()) {
    const categories = await fetchCategories();
    return categories.find(c => c.id === id);
  }
  return getCategories().find(c => c.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getCategories().find(c => c.slug === slug);
}

export async function getCategoryBySlugAsync(slug: string): Promise<Category | undefined> {
  if (shouldUseApi()) {
    const categories = await fetchCategories();
    return categories.find(c => c.slug === slug);
  }
  return getCategories().find(c => c.slug === slug);
}

export function updateCategoryOrder(categoryIds: string[]): void {
  const categories = getCategories();
  const ordered = categoryIds
    .map(id => categories.find(c => c.id === id))
    .filter((c): c is Category => c !== undefined);
  
  const remaining = categories.filter(c => !categoryIds.includes(c.id));
  const allOrdered = [...ordered, ...remaining];
  
  allOrdered.forEach((c, index) => {
    c.order = index;
  });
  
  setCategories(allOrdered);
}

export async function updateCategoryOrderAsync(categoryIds: string[]): Promise<void> {
  const categories = await fetchCategories();
  const ordered = categoryIds
    .map(id => categories.find(c => c.id === id))
    .filter((c): c is Category => c !== undefined);
  
  const remaining = categories.filter(c => !categoryIds.includes(c.id));
  const allOrdered = [...ordered, ...remaining];
  
  allOrdered.forEach((c, index) => {
    c.order = index;
  });
  
  await saveCategoriesToApi(allOrdered);
}

// ============ USER FUNCTIONS ============

export function getUsers(): User[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) return getDefaultUsers();
    return JSON.parse(data);
  } catch {
    return getDefaultUsers();
  }
}

export function setUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getDefaultUsers(): User[] {
  return [
    {
      id: '1',
      email: 'admin@smileflex.com',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      email: 'editor@smileflex.com',
      password: 'editor123',
      role: 'editor',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function getUserByEmailAsync(email: string): Promise<User | undefined> {
  // For API, we'd need a user endpoint
  // For now, use localStorage
  return getUserByEmail(email);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function getCurrentUser(): CurrentUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function getCurrentUserAsync(): Promise<CurrentUser | null> {
  try {
    const user = await api.getCurrentUser();
    if (user) {
      const currentUser: CurrentUser = {
        id: user.id,
        email: user.email,
        role: user.role as 'admin' | 'editor' | 'viewer',
      };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      return currentUser;
    }
    return null;
  } catch {
    return getCurrentUser();
  }
}

export function setCurrentUser(user: CurrentUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function validateUser(email: string, password: string): User | null {
  const user = getUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

export async function validateUserAsync(email: string, password: string): Promise<User | null> {
  try {
    const user = await api.login(email, password);
    if (user) {
      return {
        id: user.id,
        email: user.email,
        password: password,
        role: user.role as 'admin' | 'editor' | 'viewer',
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return validateUser(email, password);
  }
}

export function createUser(email: string, password: string, role: User['role'] = 'viewer'): User {
  const users = getUsers();
  const newUser: User = {
    id: generateId(),
    email,
    password,
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  setUsers(users);
  return newUser;
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return false;
  setUsers(filtered);
  return true;
}

export function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  setUsers(users);
  
  const current = getCurrentUser();
  if (current && current.id === id) {
    setCurrentUser({
      id: users[index].id,
      email: users[index].email,
      role: users[index].role,
    });
  }
  
  return users[index];
}

// ============ HELPER FUNCTIONS ============

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function makeUniqueSlug(title: string, existingMovies: Movie[]): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  let slug = base;
  let counter = 1;
  
  while (existingMovies.some(m => m.slug === slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  
  return slug;
}

// ============ INIT SEED DATA ============

export function initSeedData(): void {
  if (getCategories().length === 0) {
    setCategories(getDefaultCategories());
  }
  
  if (getUsers().length === 0) {
    setUsers(getDefaultUsers());
  }
}

export async function initSeedDataAsync(): Promise<void> {
  try {
    // Check if API is available
    const available = await checkApiAvailability();
    if (available) {
      setUseApi(true);
      // Try to fetch from API
      await fetchCategories();
      await fetchMovies();
    }
  } catch (error) {
    console.warn('API not available, using localStorage:', error);
    setUseApi(false);
  }
  
  // Always ensure localStorage has data
  if (getCategories().length === 0) {
    setCategories(getDefaultCategories());
  }
  
  if (getUsers().length === 0) {
    setUsers(getDefaultUsers());
  }
}