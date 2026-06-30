// src/lib/api.ts

// Dynamic API URL based on current host
const getApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }
  
  if (import.meta.env.DEV) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    return `http://${host}:3001/api`;
  }
  
  return '/api';
};

const API_URL = getApiUrl();
console.log('🔗 API URL:', API_URL);

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
  ads: any[];
  createdAt: string;
  year: number;
  rating: number;
  featured: boolean;
  badge: string;
  weeklyTrendingRank?: number;
  genres?: string[];
  cast_list?: string[];
  director?: string;
  country?: string;
  language?: string;
  content_rating?: string;
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
  role: string;
}

export const api = {
  // Movies
  async getMovies(): Promise<Movie[]> {
    const res = await fetch(`${API_URL}/movies`);
    if (!res.ok) throw new Error('Failed to fetch movies');
    return res.json();
  },

  async saveMovie(movie: Movie): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_URL}/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movie),
    });
    if (!res.ok) throw new Error('Failed to save movie');
    return res.json();
  },

  async deleteMovie(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/movies/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete movie');
    return res.json();
  },

  async incrementPlayCount(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/movies/${id}/play`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to update play count');
    return res.json();
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async saveCategories(categories: Category[]): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories),
    });
    if (!res.ok) throw new Error('Failed to save categories');
    return res.json();
  },

  // Users
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`${API_URL}/users/current`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<User | null> {
    const res = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    return res.json();
  }
};