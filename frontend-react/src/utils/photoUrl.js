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
  const attempts = parseInt(e.target.dataset.photoAttempts || '0', 10);
  if (attempts >= 2) return;
  e.target.dataset.photoAttempts = String(attempts + 1);

  const targetUrl = rawUrl || e.target.getAttribute('src') || '';
  if (attempts === 0 && typeof targetUrl === 'string') {
    const trimmed = targetUrl.trim();
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
      const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      // If we are already on localhost:5000, don't re-attempt same URL
      if (!e.target.src.includes(':5000')) {
        e.target.src = `http://localhost:5000${clean}`;
        return;
      }
    }
  }

  // Fallback placeholder image if URL fails or is unresolvable
  e.target.src = 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80';
}
