// src/lib/media-source.ts

export const DEFAULT_MEDIA_BASE = "/media/";

let mediaBase = DEFAULT_MEDIA_BASE;

export function getMediaBase(): string {
  try {
    const stored = localStorage.getItem("smileflex_media_base");
    if (stored) {
      mediaBase = stored;
    }
  } catch {
    // ignore
  }
  return mediaBase;
}

export function setMediaBase(base: string): void {
  mediaBase = base || DEFAULT_MEDIA_BASE;
  try {
    localStorage.setItem("smileflex_media_base", mediaBase);
    window.dispatchEvent(new CustomEvent("smileflex:media-base"));
  } catch {
    // ignore
  }
}

export function resolveMediaUrl(path: string, base?: string): string {
  if (!path) return "";
  
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  
  if (path.startsWith("/media/")) {
    return path;
  }
  
  const b = base || getMediaBase();
  const normalizedBase = b.endsWith("/") ? b : `${b}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  
  // If path starts with thumbnails/, join with base
  if (normalizedPath.startsWith("thumbnails/")) {
    return `${normalizedBase}${normalizedPath}`;
  }
  
  // Otherwise, assume it's in thumbnails
  return `${normalizedBase}thumbnails/${normalizedPath}`;
}

export function isLocalRelative(path: string): boolean {
  if (!path) return false;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return false;
  }
  return true;
}

export function getImageUrl(path: string): string {
  if (!path) return "";
  return resolveMediaUrl(path);
}