// src/lib/movie-import.ts

import { Movie, getMovies, setMovies, generateId, makeUniqueSlug } from './cms-storage';
import { getArtForTitle } from './movie-art';

export interface MovieFile {
  name: string;
  path: string;
  size: number;
  modified?: Date;
}

export interface MovieMetadata {
  description: string;
  year: number;
  duration: number;
  rating: number;
  genres: string[];
  cast_list: string[];
  director: string;
  country: string;
  language: string;
  content_rating: string;
  badge: string;
}

// Local movie metadata database
export const LOCAL_METADATA: Record<string, MovieMetadata> = {
  // ... (all your movie metadata from the BulkImportModal)
};

export function extractMovieTitle(filename: string): string {
  let title = filename.replace(/\.[^/.]+$/, "");
  title = title.replace(/\s*\(\d{4}\)\s*/, "");
  title = title.replace(/-\d{4}$/, "");
  title = title.replace(/\d{4}$/, "");
  title = title.replace(/[-_]/g, " ");
  title = title.replace(/\s+/g, " ").trim();
  
  // Handle special cases
  const specialCases: Record<string, string> = {
    'spider man 3': 'Spider-Man 3',
    'i robot': 'I, Robot',
    'moana2': 'Moana 2',
    'toy': 'Toy Story',
    'toy story 2': 'Toy Story 2',
    'just laugh out load': 'Just Laugh Out Load',
  };
  
  const lower = title.toLowerCase();
  return specialCases[lower] || title;
}

export function getLocalMetadata(title: string): MovieMetadata | null {
  const normalized = title.toLowerCase().trim();
  
  // Exact match
  if (LOCAL_METADATA[normalized]) {
    return LOCAL_METADATA[normalized];
  }
  
  // Partial match
  for (const [key, metadata] of Object.entries(LOCAL_METADATA)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return metadata;
    }
  }
  
  return null;
}

export function generateFallbackMetadata(title: string): MovieMetadata {
  return {
    description: `${title} is an engaging film that captivates audiences with its compelling storyline and remarkable performances.`,
    year: new Date().getFullYear(),
    duration: 120,
    rating: 7.0,
    genres: ["Drama"],
    cast_list: ["Main Actor", "Supporting Actor"],
    director: "Director Name",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: `${title} - A must watch!`
  };
}

export function getMovieMetadata(title: string): MovieMetadata {
  const metadata = getLocalMetadata(title);
  return metadata || generateFallbackMetadata(title);
}

export function createMovieFromFile(
  file: MovieFile,
  categoryId: string,
  options?: {
    published?: boolean;
    description?: string;
  }
): Movie {
  const title = extractMovieTitle(file.name);
  const metadata = getMovieMetadata(title);
  const existing = getMovies();
  const art = getArtForTitle(title);
  
  return {
    id: generateId(),
    title: title,
    slug: makeUniqueSlug(title, existing),
    description: options?.description || metadata.description,
    poster: art.poster,
    backdrop: art.backdrop,
    video: file.path,
    duration: metadata.duration,
    categoryId: categoryId,
    published: options?.published ?? true,
    ads: [],
    createdAt: new Date().toISOString(),
    year: metadata.year,
    rating: metadata.rating,
    featured: false,
    badge: metadata.badge,
    genres: metadata.genres,
    cast_list: metadata.cast_list,
    director: metadata.director,
    country: metadata.country,
    language: metadata.language,
    content_rating: metadata.content_rating,
  };
}

export function importMovieFiles(
  files: MovieFile[],
  categoryId: string,
  options?: {
    published?: boolean;
    skipDuplicates?: boolean;
    onProgress?: (current: number, total: number) => void;
  }
): { imported: number; skipped: number; movies: Movie[] } {
  const existing = getMovies();
  const imported: Movie[] = [];
  let skipped = 0;
  
  files.forEach((file, index) => {
    const title = extractMovieTitle(file.name);
    
    // Check for duplicates
    if (options?.skipDuplicates) {
      const duplicate = existing.find(m => 
        m.title.toLowerCase() === title.toLowerCase()
      );
      if (duplicate) {
        skipped++;
        return;
      }
    }
    
    const movie = createMovieFromFile(file, categoryId, options);
    imported.push(movie);
    existing.push(movie);
    
    if (options?.onProgress) {
      options.onProgress(index + 1, files.length);
    }
  });
  
  setMovies(existing);
  
  return {
    imported: imported.length,
    skipped: skipped,
    movies: imported,
  };
}

// Scan a directory for movie files (browser-side)
export async function scanMovieFiles(): Promise<MovieFile[]> {
  // In a browser environment, we need to use file input
  // This is a helper for when files are selected via input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.accept = '.mp4,.mkv,.avi,.mov,.wmv,.flv,.webm';
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) {
        resolve([]);
        return;
      }
      
      const movieFiles: MovieFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Only include video files
        if (file.type.startsWith('video/')) {
          movieFiles.push({
            name: file.name,
            path: URL.createObjectURL(file),
            size: file.size,
            modified: new Date(file.lastModified),
          });
        }
      }
      resolve(movieFiles);
    };
    
    input.click();
  });
}

// Import multiple movies from file list
export async function importMoviesFromFiles(
  files: FileList | File[],
  categoryId: string,
  options?: {
    published?: boolean;
    skipDuplicates?: boolean;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<{ imported: number; skipped: number; movies: Movie[] }> {
  const fileArray = Array.from(files);
  const movieFiles: MovieFile[] = fileArray.map(file => ({
    name: file.name,
    path: URL.createObjectURL(file),
    size: file.size,
    modified: new Date(file.lastModified),
  }));
  
  return importMovieFiles(movieFiles, categoryId, options);
}