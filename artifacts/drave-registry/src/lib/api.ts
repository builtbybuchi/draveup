export function apiUrl(path: string): string {
  const backendUrl = import.meta.env.BACKEND_URL;
  if (!backendUrl) return path;
  return new URL(path, backendUrl).toString();
}