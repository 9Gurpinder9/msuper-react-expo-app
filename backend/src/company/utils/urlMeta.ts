import axios from 'axios';

export type BookmarkMetaFields = {
  thumbnail_url?: string;
  favicon_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
};

const REQUEST_TIMEOUT_MS = 8000;

export async function fetchUrlMetadata(rawUrl: string): Promise<BookmarkMetaFields> {
  const url = normalizeAbsoluteUrl(rawUrl);
  if (!url) return {};

  const response = await axios.get<string>(url, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': 'msuper-bookmarks-meta-fetcher/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const html = String(response.data || '');
  if (!html) return {};

  const finalUrl = normalizeAbsoluteUrl(response.request?.res?.responseUrl) || url;
  const ogTitle = pickText(
    getMetaContent(html, 'property', 'og:title'),
    getMetaContent(html, 'name', 'twitter:title')
  );
  const ogDescription = pickText(
    getMetaContent(html, 'property', 'og:description'),
    getMetaContent(html, 'name', 'twitter:description'),
    getMetaContent(html, 'name', 'description')
  );
  const ogImage = normalizeAbsoluteUrl(
    pickText(
      getMetaContent(html, 'property', 'og:image'),
      getMetaContent(html, 'name', 'twitter:image')
    ),
    finalUrl
  );
  const favicon = normalizeAbsoluteUrl(getIconHref(html), finalUrl);

  const out: BookmarkMetaFields = {};
  if (ogTitle) out.og_title = ogTitle;
  if (ogDescription) out.og_description = ogDescription;
  if (ogImage) {
    out.og_image = ogImage;
    out.thumbnail_url = ogImage;
  }
  if (favicon) out.favicon_url = favicon;
  return out;
}

function getMetaContent(html: string, attr: 'property' | 'name', key: string): string | null {
  const escaped = escapeRegex(key);
  const patternA = new RegExp(
    `<meta[^>]*${attr}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
    'i'
  );
  const matchA = html.match(patternA);
  if (matchA?.[1]) return matchA[1];

  const patternB = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${attr}\\s*=\\s*["']${escaped}["'][^>]*>`,
    'i'
  );
  const matchB = html.match(patternB);
  if (matchB?.[1]) return matchB[1];
  return null;
}

function getIconHref(html: string): string | null {
  const patternA = /<link[^>]*rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i;
  const matchA = html.match(patternA);
  if (matchA?.[1]) return matchA[1];

  const patternB = /<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/i;
  const matchB = html.match(patternB);
  if (matchB?.[1]) return matchB[1];
  return null;
}

function pickText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned) return cleaned;
  }
  return '';
}

function normalizeAbsoluteUrl(rawValue?: string | null, baseUrl?: string) {
  if (!rawValue) return '';
  const value = String(rawValue).trim();
  if (!value) return '';
  try {
    if (baseUrl) return new URL(value, baseUrl).toString();
    return new URL(value).toString();
  } catch {
    return '';
  }
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
