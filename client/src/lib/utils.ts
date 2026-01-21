import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/api/object-storage")) return url;
  if (url.startsWith("/objects/")) return `/api/object-storage${url}`;
  return url;
}
