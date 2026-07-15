// Shared image-URL handling for product images. Previously copy-pasted with drift
// across app/shop/page.tsx, app/admin/products/page.tsx and components/sections/ShopPreview.tsx.

// Cloudinary URLs saved from the admin console UI sometimes carry a base64-encoded
// "drilldown" segment or point at the console's thumbnail endpoint instead of the
// public delivery endpoint. Normalize both back to a plain deliverable image URL.
export function fixImageUrl(url: string): string {
  if (!url) return url;
  const drilldown = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\/)([A-Za-z0-9+/=]+)\/drilldown\/?$/);
  if (drilldown) {
    try { url = drilldown[1] + atob(drilldown[2]); } catch { /* leave as-is */ }
  }
  url = url.replace(
    /res-console\.cloudinary\.com\/([^/]+)\/thumbnails\/v1\/image\/upload\//,
    'res.cloudinary.com/$1/image/upload/'
  );
  if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\/[^./]+$/.test(url)) {
    url = url + '.png';
  }
  return url;
}

export function parseImages(url?: string | null): string[] {
  if (!url) return [];
  return url.split(',').map(u => fixImageUrl(u.trim())).filter(Boolean);
}
