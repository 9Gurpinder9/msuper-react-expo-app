import { RequestHandler } from 'express';
import logger from '../../utils/logger';
import {
  listBookmarks,
  createBookmark,
  updateBookmark,
  softDeleteBookmark,
  refreshBookmarkMeta,
} from '../services/bookmarks.service';
import { fetchUrlMetadata } from '../utils/urlMeta';

export const listBookmarksHandler: RequestHandler = async (req, res) => {
  try {
    const { search, favorite, category_id, tag, deleted, limit, offset } = req.query;
    const filters = {
      search: typeof search === 'string' && search.trim() ? search.trim() : undefined,
      favorite: typeof favorite === 'string' ? favorite.toLowerCase() === 'true' : false,
      category_id:
        typeof category_id === 'string' && category_id.trim() ? category_id.trim() : undefined,
      tag: typeof tag === 'string' && tag.trim() ? tag.trim() : undefined,
      deleted: typeof deleted === 'string' ? deleted.toLowerCase() === 'true' : false,
      limit: typeof limit === 'string' ? Number(limit) : undefined,
      offset: typeof offset === 'string' ? Number(offset) : undefined,
    };

    const result = await listBookmarks(filters);
    res.json({ success: true, data: result.data, count: result.count });
  } catch (err: any) {
    logger.error('List bookmarks failed', err);
    res.status(500).json({ success: false, message: 'Failed to load bookmarks.' });
  }
};

export const createBookmarkHandler: RequestHandler = async (req, res) => {
  try {
    const payload = { ...req.body };
    await applyMetadataToPayload(payload);
    if (!payload.title || String(payload.title).trim() === '') {
      payload.title = deriveTitleFromUrl(String(payload.url || ''));
    }
    const created = await createBookmark(payload);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    logger.error('Create bookmark failed', err);
    res.status(500).json({ success: false, message: 'Failed to create bookmark.' });
  }
};

export const updateBookmarkHandler: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'Missing bookmark id.' });
      return;
    }
    const payload = { ...req.body };
    await applyMetadataToPayload(payload);
    const updated = await updateBookmark(id, payload);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    logger.error('Update bookmark failed', err);
    res.status(500).json({ success: false, message: 'Failed to update bookmark.' });
  }
};

export const deleteBookmarkHandler: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'Missing bookmark id.' });
      return;
    }
    const deleted = await softDeleteBookmark(id);
    res.json({ success: true, data: deleted });
  } catch (err: any) {
    logger.error('Delete bookmark failed', err);
    res.status(500).json({ success: false, message: 'Failed to delete bookmark.' });
  }
};

export const refreshBookmarkMetaHandler: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'Missing bookmark id.' });
      return;
    }
    const data = await refreshBookmarkMeta(id);
    res.json({ success: true, data });
  } catch (err: any) {
    logger.error('Refresh bookmark meta failed', err);
    res.status(500).json({ success: false, message: 'Failed to refresh metadata.' });
  }
};

function deriveTitleFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').split('.')[0] || 'Link';
    const pathSeg =
      url.pathname
        .split('/')
        .map((seg) => seg.trim())
        .find((seg) => seg) || '';
    const cleanedHost = cleanWord(host);
    const cleanedSeg = cleanWord(pathSeg);
    const parts = [cleanedHost, cleanedSeg].filter(Boolean);
    const unique = parts.filter((part, idx) => parts.indexOf(part) === idx);
    const title = unique
      .join(' ')
      .split(/\s+/)
      .slice(0, 3)
      .join(' ')
      .trim();
    return title || 'Link';
  } catch {
    return 'Link';
  }
}

function cleanWord(value: string) {
  if (!value) return '';
  const trimmed = value.replace(/[-_]+/g, ' ').replace(/[^\w\s]/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function applyMetadataToPayload(payload: Record<string, unknown>) {
  const rawUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
  if (!rawUrl) return;

  const needsMeta =
    !payload.thumbnail_url ||
    !payload.favicon_url ||
    !payload.og_title ||
    !payload.og_description ||
    !payload.og_image;
  if (!needsMeta) return;

  try {
    const meta = await fetchUrlMetadata(rawUrl);
    if (!payload.thumbnail_url && meta.thumbnail_url) payload.thumbnail_url = meta.thumbnail_url;
    if (!payload.favicon_url && meta.favicon_url) payload.favicon_url = meta.favicon_url;
    if (!payload.og_title && meta.og_title) payload.og_title = meta.og_title;
    if (!payload.og_description && meta.og_description) payload.og_description = meta.og_description;
    if (!payload.og_image && meta.og_image) payload.og_image = meta.og_image;
  } catch (err: any) {
    logger.warn('Bookmark metadata fetch failed', {
      url: rawUrl,
      error: err?.message || String(err),
    });
  }
}
