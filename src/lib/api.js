const API_BASE = import.meta.env.VITE_API_BASE?.trim();

export function apiUrl(path) {
  if (!API_BASE || /^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(path, API_BASE).toString();
}

export function apiFetch(path, options) {
  return fetch(apiUrl(path), options);
}
