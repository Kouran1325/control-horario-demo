export function getLastPathSegment(request: Request): string | null {
const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last ? decodeURIComponent(last) : null;
}