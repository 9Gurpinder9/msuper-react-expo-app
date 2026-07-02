// backend/src/super-admin/controllers/company.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,owner_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch companies', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch companies' });
    }

    const total = count ?? 0;
    const hasMore = offset + limit < total;

    return res.status(200).json({
      ok: true,
      data: data || [],
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

export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;

    // 1. Check for duplicates (email should be unique)
    const { data: existing, error: checkError } = await supabase
      .from('companies')
      .select('id, name, email')
      .or(`email.ilike.${body.email.trim()},name.ilike.${body.name.trim()}`);

    if (checkError) {
      logger.error('Error checking duplicate company details', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing && existing.length > 0) {
      const match = existing[0];
      const field = match.email.toLowerCase() === body.email.trim().toLowerCase() ? 'email' : 'name';
      return res.status(409).json({
        ok: false,
        message: `A company with this ${field} already exists.`,
      });
    }

    // 2. Fetch the role ID for ADMIN
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'ADMIN')
      .eq('is_active', true)
      .maybeSingle();

    if (roleError || !roleData) {
      logger.error('Failed to fetch ADMIN role for new company default user', { error: roleError });
      return res.status(500).json({ ok: false, message: 'Default role initialization failed' });
    }

    // 3. Insert company details
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        owner_name: body.owner_name.trim(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        mobile1: body.mobile1.trim(),
        mobile2: body.mobile2 ? body.mobile2.trim() : null,
        country_id: body.country_id,
        country_name: body.country_name.trim(),
        state_id: body.state_id,
        state_name: body.state_name.trim(),
        city_id: body.city_id,
        city_name: body.city_name.trim(),
        category_id: body.category_id,
        category_name: body.category_name.trim(),
        plan_id: body.plan_id,
        gst_no: body.gst_no ? body.gst_no.trim().toUpperCase() : null,
        address1: body.address1 ? body.address1.trim().toUpperCase() : null,
        address2: body.address2 ? body.address2.trim().toUpperCase() : null,
        print_name: body.print_name ? body.print_name.trim().toUpperCase() : null,
        validity_date: body.validity_date,
        expiry_date: body.expiry_date,
        is_active: body.is_active ?? true,
      })
      .select('*')
      .single();

    if (companyError || !companyData) {
      logger.error('Failed to create company', { error: companyError });
      return res.status(500).json({ ok: false, message: 'Failed to create company' });
    }

    // 4. Create first default user (ADMIN role) in users table
    const userPayload: any = {
      company_id: companyData.id,
      role_id: roleData.id,
      email: companyData.email,
      name: companyData.owner_name,
      mobile: companyData.mobile1,
      country_id: companyData.country_id,
      country_name: companyData.country_name,
      state_id: companyData.state_id,
      state_name: companyData.state_name,
      city_id: companyData.city_id,
      city_name: companyData.city_name,
      address: companyData.address1,
      is_active: true,
      email_verified: false,
    };

    if (body.password) {
      userPayload.password = await bcrypt.hash(body.password, 10);
    }

    const { error: userError } = await supabase
      .from('users')
      .insert(userPayload);

    if (userError) {
      logger.error('Failed to create default ADMIN user for new company', { error: userError });
      // Delete the created company to maintain database consistency
      await supabase.from('companies').delete().eq('id', companyData.id);
      return res.status(500).json({ ok: false, message: 'Failed to create default company user' });
    }

    return res.status(201).json({ ok: true, data: companyData, message: 'Company created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = req.body;

    // Fetch current company record to verify existence
    const { data: currentCompany, error: currentError } = await supabase
      .from('companies')
      .select('email')
      .eq('id', id)
      .single();

    if (currentError || !currentCompany) {
      logger.error('Failed to find company for update', { error: currentError });
      return res.status(404).json({ ok: false, message: 'Company not found' });
    }

    // 1. Check for duplicates excluding current company ID
    const { data: existing, error: checkError } = await supabase
      .from('companies')
      .select('id, name, email')
      .or(`email.ilike.${body.email.trim()},name.ilike.${body.name.trim()}`);

    if (checkError) {
      logger.error('Error checking duplicate company update details', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];

    if (duplicates.length > 0) {
      const match = duplicates[0];
      const field = match.email.toLowerCase() === body.email.trim().toLowerCase() ? 'email' : 'name';
      return res.status(409).json({
        ok: false,
        message: `A company with this ${field} already exists.`,
      });
    }

    // 2. Update company details (excluding passwords and email verifications)
    const updatePayload: any = {
      owner_name: body.owner_name.trim(),
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      mobile1: body.mobile1.trim(),
      mobile2: body.mobile2 ? body.mobile2.trim() : null,
      country_id: body.country_id,
      country_name: body.country_name.trim(),
      state_id: body.state_id,
      state_name: body.state_name.trim(),
      city_id: body.city_id,
      city_name: body.city_name.trim(),
      category_id: body.category_id,
      category_name: body.category_name.trim(),
      plan_id: body.plan_id,
      gst_no: body.gst_no ? body.gst_no.trim().toUpperCase() : null,
      address1: body.address1 ? body.address1.trim().toUpperCase() : null,
      address2: body.address2 ? body.address2.trim().toUpperCase() : null,
      print_name: body.print_name ? body.print_name.trim().toUpperCase() : null,
      validity_date: body.validity_date,
      expiry_date: body.expiry_date,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update company details', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update company details' });
    }

    return res.status(200).json({ ok: true, data, message: 'Company updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function toggleCompanyStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('companies')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to toggle company status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update status' });
    }

    return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
}
