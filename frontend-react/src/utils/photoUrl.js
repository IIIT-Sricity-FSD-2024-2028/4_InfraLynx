/**
 * Utility to reliably resolve and render photo evidence URLs
 * Supports:
 *  - Server relative paths: /uploads/evidence-xxx.jpg
 *  - Base64 data URLs: data:image/...
 *  - External URLs: https://...
 *  - Automatic fallback to backend port 5000 if frontend proxy is bypassed
 */

export function getPhotoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '[image_data]') return '';

  // Data URLs, blobs, or absolute web URLs
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Server uploads path
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return clean;
  }

  return trimmed;
}

export function handlePhotoError(e, rawUrl) {
  if (!e || !e.target) return;
  if (e.target.dataset.triedFallback === 'true') return;
  e.target.dataset.triedFallback = 'true';

  const targetUrl = rawUrl || e.target.getAttribute('src') || '';
  if (typeof targetUrl === 'string') {
    const trimmed = targetUrl.trim();
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
      const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      e.target.src = `http://localhost:5000${clean}`;
      return;
    }
  }

  // Fallback placeholder image if URL is completely missing or unresolvable
  e.target.src = 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80';
}
