// backend/src/super-admin/controllers/city.controller.ts
import { Request, Response, NextFunction } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getCities(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string;
    const stateId = req.query.state_id as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('cities')
      .select('*, states(name, countries(name))', { count: 'exact' })
      .order('name', { ascending: true });

    if (stateId) {
      query = query.eq('state_id', stateId);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch cities', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch cities' });
    }

    // Format the response to flatten names
    const formattedData = (data ?? []).map((city: any) => ({
      ...city,
      state_name: city.states?.name || 'Unknown',
      country_name: city.states?.countries?.name || 'Unknown',
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

export async function createCity(req: Request, res: Response, next: NextFunction) {
  try {
    const { state_id, name, is_active } = req.body;

    // 1. Check for duplicates in the same state
    const { data: existing, error: checkError } = await supabase
      .from('cities')
      .select('id, name')
      .eq('state_id', state_id)
      .ilike('name', name.trim());

    if (checkError) {
      logger.error('Error checking duplicate city', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'A city with this name already exists in this state.',
      });
    }

    // 2. Insert city
    const { data, error } = await supabase
      .from('cities')
      .insert({
        state_id,
        name: name.trim(),
        is_active: is_active ?? true,
      })
      .select('*, states(name, countries(name))')
      .single();

    if (error) {
      logger.error('Failed to create city', { error });
      return res.status(500).json({ ok: false, message: 'Failed to create city' });
    }

    const formattedData = {
      ...data,
      state_name: (data as any).states?.name || 'Unknown',
      country_name: (data as any).states?.countries?.name || 'Unknown',
    };

    return res.status(201).json({ ok: true, data: formattedData, message: 'City created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateCity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { state_id, name, is_active } = req.body;

    // 1. Check for duplicates in the same state excluding current id
    const { data: existing, error: checkError } = await supabase
      .from('cities')
      .select('id, name')
      .eq('state_id', state_id)
      .ilike('name', name.trim());

    if (checkError) {
      logger.error('Error checking duplicate city update', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];

    if (duplicates.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'A city with this name already exists in this state.',
      });
    }

    // 2. Update city
    const { data, error } = await supabase
      .from('cities')
      .update({
        state_id,
        name: name.trim(),
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select('*, states(name, countries(name))')
      .single();

    if (error) {
      logger.error('Failed to update city', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update city' });
    }

    const formattedData = {
      ...data,
      state_name: (data as any).states?.name || 'Unknown',
      country_name: (data as any).states?.countries?.name || 'Unknown',
    };

    return res.status(200).json({ ok: true, data: formattedData, message: 'City updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleCityStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('cities')
      .update({ is_active })
      .eq('id', id)
      .select('*, states(name, countries(name))')
      .single();

    if (error) {
      logger.error('Failed to toggle city status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update status' });
    }

    const formattedData = {
      ...data,
      state_name: (data as any).states?.name || 'Unknown',
      country_name: (data as any).states?.countries?.name || 'Unknown',
    };

    return res.status(200).json({ ok: true, data: formattedData, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
}
