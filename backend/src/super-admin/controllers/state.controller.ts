// backend/src/super-admin/controllers/state.controller.ts
import { Request, Response, NextFunction } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getStates(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string;
    const countryId = req.query.country_id as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('states')
      .select('*, countries(name)', { count: 'exact' })
      .order('name', { ascending: true });

    if (countryId) {
      query = query.eq('country_id', countryId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch states', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch states' });
    }

    // Format the country name for cleaner response if joined
    const formattedData = (data ?? []).map((state: any) => ({
      ...state,
      country_name: state.countries?.name || 'Unknown',
    }));

    const total = count ?? 0;
    const hasMore = offset + limit < total;

    return res.status(200).json({
      ok: true,
      data: formattedData,
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

export async function createState(req: Request, res: Response, next: NextFunction) {
  try {
    const { country_id, name, code, is_active } = req.body;

    // 1. Check for duplicates in the same country
    const { data: existing, error: checkError } = await supabase
      .from('states')
      .select('id, name, code')
      .eq('country_id', country_id)
      .or(`name.ilike.${name.trim()},code.ilike.${code.trim()}`);

    if (checkError) {
      logger.error('Error checking duplicate state', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing && existing.length > 0) {
      const match = existing[0];
      const field = match.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'code';
      return res.status(409).json({
        ok: false,
        message: `A state with this ${field} already exists in this country.`,
      });
    }

    // 2. Insert state
    const { data, error } = await supabase
      .from('states')
      .insert({
        country_id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        is_active: is_active ?? true,
      })
      .select('*, countries(name)')
      .single();

    if (error) {
      logger.error('Failed to create state', { error });
      return res.status(500).json({ ok: false, message: 'Failed to create state' });
    }

    const formattedData = {
      ...data,
      country_name: (data as any).countries?.name || 'Unknown',
    };

    return res.status(201).json({ ok: true, data: formattedData, message: 'State created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateState(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { country_id, name, code, is_active } = req.body;

    // 1. Check for duplicates in the same country excluding current id
    const { data: existing, error: checkError } = await supabase
      .from('states')
      .select('id, name, code')
      .eq('country_id', country_id)
      .or(`name.ilike.${name.trim()},code.ilike.${code.trim()}`);

    if (checkError) {
      logger.error('Error checking duplicate state update', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];

    if (duplicates.length > 0) {
      const match = duplicates[0];
      const field = match.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'code';
      return res.status(409).json({
        ok: false,
        message: `A state with this ${field} already exists in this country.`,
      });
    }

    // 2. Update state
    const { data, error } = await supabase
      .from('states')
      .update({
        country_id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select('*, countries(name)')
      .single();

    if (error) {
      logger.error('Failed to update state', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update state' });
    }

    const formattedData = {
      ...data,
      country_name: (data as any).countries?.name || 'Unknown',
    };

    return res.status(200).json({ ok: true, data: formattedData, message: 'State updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleStateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('states')
      .update({ is_active })
      .eq('id', id)
      .select('*, countries(name)')
      .single();

    if (error) {
      logger.error('Failed to toggle state status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update status' });
    }

    const formattedData = {
      ...data,
      country_name: (data as any).countries?.name || 'Unknown',
    };

    return res.status(200).json({ ok: true, data: formattedData, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
}
