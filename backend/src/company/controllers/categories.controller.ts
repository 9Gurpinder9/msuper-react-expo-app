import { RequestHandler } from 'express';
import logger from '../../utils/logger';
import { createCategory, listCategories, updateCategory } from '../services/categories.service';

export const listCategoriesHandler: RequestHandler = async (_req, res) => {
  try {
    const data = await listCategories();
    res.json({ success: true, data });
  } catch (err: any) {
    logger.error('List categories failed', err);
    res.status(500).json({ success: false, message: 'Failed to load categories.' });
  }
};

export const createCategoryHandler: RequestHandler = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const data = await createCategory(name);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    if (status === 409) {
      res.status(409).json({ success: false, message: err.message });
      return;
    }
    logger.error('Create category failed', err);
    res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
};

export const updateCategoryHandler: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'Missing category id.' });
      return;
    }
    const name = String(req.body.name || '').trim();
    const data = await updateCategory(id, name);
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    if (status === 409) {
      res.status(409).json({ success: false, message: err.message });
      return;
    }
    logger.error('Update category failed', err);
    res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
};
