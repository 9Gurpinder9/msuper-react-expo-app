import { RequestHandler } from 'express';
import logger from '../../utils/logger';
import {
  listBookmarks,
  createBookmark,
  updateBookmark,
  softDeleteBookmark,
  refreshBookmarkMeta,
} from '../services/bookmarks.service';

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
    const payload = req.body;
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
    const payload = req.body;
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
