// backend/src/super-admin/controllers/feature.controller.ts
import { Request, Response, NextFunction } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getFeatures(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('features')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch features', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch features' });
    }

    const total = count ?? 0;
    const hasMore = offset + limit < total;

    return res.status(200).json({
      ok: true,
      data,
      pagination: {
        page,
        limit,
        total,
        has_more: hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createFeature(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, display_name, description, is_active } = req.body;

    // 1. Check for duplicate name
    const { data: existing, error: checkError } = await supabase
      .from('features')
      .select('id, name')
      .ilike('name', name.trim());

    if (checkError) {
      logger.error('Error checking duplicate feature', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'A feature with this name already exists.',
      });
    }

    // 2. Insert feature
    const { data, error } = await supabase
      .from('features')
      .insert({
        name: name.trim(),
        display_name: display_name.trim(),
        description: description ? description.trim() : null,
        is_active: is_active ?? true,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to create feature', { error });
      return res.status(500).json({ ok: false, message: 'Failed to create feature' });
    }

    return res.status(201).json({ ok: true, data, message: 'Feature created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateFeature(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, display_name, description, is_active } = req.body;

    // 1. Check duplicate excluding current ID
    const { data: existing, error: checkError } = await supabase
      .from('features')
      .select('id, name')
      .ilike('name', name.trim());

    if (checkError) {
      logger.error('Error checking duplicate feature update', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];

    if (duplicates.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'A feature with this name already exists.',
      });
    }

    // 2. Update feature
    const { data, error } = await supabase
      .from('features')
      .update({
        name: name.trim(),
        display_name: display_name.trim(),
        description: description ? description.trim() : null,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update feature', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update feature' });
    }

    return res.status(200).json({ ok: true, data, message: 'Feature updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleFeatureStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('features')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to toggle feature status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to toggle status' });
    }

    return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
}
