// backend/src/super-admin/controllers/role.controller.ts
import { Request, Response, NextFunction } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('roles')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch roles', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch roles' });
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

export async function createRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, is_active } = req.body;

    // 1. Check for duplicate name
    const { data: existing, error: checkError } = await supabase
      .from('roles')
      .select('id, name')
      .ilike('name', name.trim().toUpperCase());

    if (checkError) {
      logger.error('Error checking duplicate role', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'A role with this name already exists.',
      });
    }

    // 2. Insert role
    const { data, error } = await supabase
      .from('roles')
      .insert({
        name: name.trim().toUpperCase(),
        is_active: is_active ?? true,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to create role', { error });
      return res.status(500).json({ ok: false, message: 'Failed to create role' });
    }

    return res.status(201).json({ ok: true, data, message: 'Role created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    // 1. Check duplicate excluding current ID
    const { data: existing, error: checkError } = await supabase
      .from('roles')
      .select('id, name')
      .ilike('name', name.trim().toUpperCase());

    if (checkError) {
      logger.error('Error checking duplicate role update', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];

    if (duplicates.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'A role with this name already exists.',
      });
    }

    // 2. Update role
    const { data, error } = await supabase
      .from('roles')
      .update({
        name: name.trim().toUpperCase(),
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update role', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update role' });
    }

    return res.status(200).json({ ok: true, data, message: 'Role updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleRoleStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('roles')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to toggle role status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to toggle status' });
    }

    return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
}
