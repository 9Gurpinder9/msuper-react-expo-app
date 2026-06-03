// backend/src/super-admin/controllers/country.controller.ts
import { Request, Response, NextFunction } from 'express';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getCountries(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('countries')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch countries', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch countries' });
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

export async function createCountry(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, code, phone_code, is_active } = req.body;

    // 1. Check for duplicates (case insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('countries')
      .select('id, name, code')
      .or(`name.ilike.${name.trim()},code.ilike.${code.trim()}`);

    if (checkError) {
      logger.error('Error checking duplicate country', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing && existing.length > 0) {
      const match = existing[0];
      const field = match.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'code';
      return res.status(409).json({
        ok: false,
        message: `A country with this ${field} already exists.`,
      });
    }

    // 2. Insert country
    const { data, error } = await supabase
      .from('countries')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone_code: phone_code ? phone_code.trim() : null,
        is_active: is_active ?? true,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to create country', { error });
      return res.status(500).json({ ok: false, message: 'Failed to create country' });
    }

    return res.status(201).json({ ok: true, data, message: 'Country created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateCountry(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, code, phone_code, is_active } = req.body;

    // 1. Check for duplicates excluding current id
    const { data: existing, error: checkError } = await supabase
      .from('countries')
      .select('id, name, code')
      .or(`name.ilike.${name.trim()},code.ilike.${code.trim()}`);

    if (checkError) {
      logger.error('Error checking duplicate country update', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];

    if (duplicates.length > 0) {
      const match = duplicates[0];
      const field = match.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'code';
      return res.status(409).json({
        ok: false,
        message: `A country with this ${field} already exists.`,
      });
    }

    // 2. Update country
    const { data, error } = await supabase
      .from('countries')
      .update({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone_code: phone_code ? phone_code.trim() : null,
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update country', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update country' });
    }

    return res.status(200).json({ ok: true, data, message: 'Country updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleCountryStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('countries')
      .update({ is_active })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to toggle country status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update status' });
    }

    return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
}
