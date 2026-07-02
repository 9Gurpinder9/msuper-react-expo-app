// backend/src/super-admin/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';
import redis from '../../database/redisClient';
import { generateNumericOtp } from '../../utils/otpGenerator';
import { sendOtpEmail, sendUserVerificationEmail } from '../../utils/emailSender';

export async function getCompanyUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    if (!companyId) {
      return res.status(400).json({ ok: false, message: 'Company ID is required' });
    }

    // Query users joining roles table
    let query = supabase
      .from('users')
      .select('*, roles(id, name)', { count: 'exact' })
      .eq('company_id', companyId)
      .order('id', { ascending: true });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      logger.error('Failed to fetch company users', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch users' });
    }

    // Map data to clean user structures
    const sanitizedData = (data || []).map((u: any) => {
      const { password, roles, ...rest } = u;
      return {
        ...rest,
        role_name: roles?.name || 'USER',
        has_password: !!password,
      };
    });

    const total = count ?? 0;
    const hasMore = offset + limit < total;

    return res.status(200).json({
      ok: true,
      data: sanitizedData,
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

export async function createCompanyUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;

    // 1. Check for duplicates (email must be unique per company)
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', body.company_id)
      .ilike('email', body.email.trim().toLowerCase())
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking duplicate user', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing) {
      return res.status(409).json({ ok: false, message: 'A user with this email already exists in this company.' });
    }

    // 2. Hash password if provided
    const userPayload: any = {
      company_id: body.company_id,
      role_id: body.role_id,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      mobile: body.mobile ? body.mobile.trim() : null,
      country_id: body.country_id,
      country_name: body.country_name ? body.country_name.trim() : null,
      state_id: body.state_id,
      state_name: body.state_name ? body.state_name.trim() : null,
      city_id: body.city_id,
      city_name: body.city_name ? body.city_name.trim() : null,
      address: body.address ? body.address.trim() : null,
      is_active: body.is_active ?? true,
      email_verified: false,
    };

    if (body.password) {
      userPayload.password = await bcrypt.hash(body.password, 10);
    }

    // 3. Insert user details
    const { data, error } = await supabase
      .from('users')
      .insert(userPayload)
      .select('*, roles(id, name)')
      .single();

    if (error || !data) {
      logger.error('Failed to create company user', { error });
      return res.status(500).json({ ok: false, message: 'Failed to create user' });
    }

    const { password, roles, ...rest } = data as any;
    return res.status(201).json({
      ok: true,
      data: { ...rest, role_name: roles?.name || 'USER', has_password: !!password },
      message: 'User created successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCompanyUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = req.body;

    const { data: currentUser, error: currentError } = await supabase
      .from('users')
      .select('email, password')
      .eq('id', id)
      .single();

    if (currentError || !currentUser) {
      logger.error('Failed to find user for update', { error: currentError });
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const emailChanged = currentUser.email.toLowerCase() !== body.email.trim().toLowerCase();

    // 1. Check duplicate email excluding current user ID
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', body.company_id)
      .ilike('email', body.email.trim().toLowerCase());

    const duplicates = (existing || []).filter((u: any) => String(u.id) !== String(id));
    if (duplicates.length > 0) {
      return res.status(409).json({ ok: false, message: 'A user with this email already exists in this company.' });
    }

    if (emailChanged) {
      await redis.del(`user:verify:${id}`);
    }

    // 2. Build payload
    const updatePayload: any = {
      role_id: body.role_id,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      mobile: body.mobile ? body.mobile.trim() : null,
      country_id: body.country_id,
      country_name: body.country_name ? body.country_name.trim() : null,
      state_id: body.state_id,
      state_name: body.state_name ? body.state_name.trim() : null,
      city_id: body.city_id,
      city_name: body.city_name ? body.city_name.trim() : null,
      address: body.address ? body.address.trim() : null,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (emailChanged) {
      updatePayload.email_verified = false;
      updatePayload.verification_sent_at = null;
    }

    if (body.password) {
      updatePayload.password = await bcrypt.hash(body.password, 10);
    }

    // 3. Update user
    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select('*, roles(id, name)')
      .single();

    if (error || !data) {
      logger.error('Failed to update user details', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update user details' });
    }

    const { password, roles, ...rest } = data as any;
    return res.status(200).json({
      ok: true,
      data: { ...rest, role_name: roles?.name || 'USER', has_password: !!password },
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, roles(id, name)')
      .single();

    if (error || !data) {
      logger.error('Failed to toggle user status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to update status' });
    }

    const { password, roles, ...rest } = data as any;
    return res.status(200).json({
      ok: true,
      data: { ...rest, role_name: roles?.name || 'USER', has_password: !!password },
      message: 'Status updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function sendUserVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, name, email, company_id, companies(name)')
      .eq('id', id)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const email = user.email;
    const companyName = (user as any)?.companies?.name || 'Your Company';
    const cooldownKey = `user:verify:cooldown:${id}`;

    const cooling = await redis.get(cooldownKey);
    if (cooling) {
      const ttl = await redis.ttl(cooldownKey);
      return res.status(429).json({
        ok: false,
        message: ttl && ttl > 0 ? `Please wait ${ttl} seconds before requesting a new OTP.` : 'Please wait before requesting a new OTP.'
      });
    }

    const otp = generateNumericOtp();

    try {
      await sendUserVerificationEmail(email, otp, user.name, companyName);
    } catch (mailErr: any) {
      logger.error(`Failed to send user verification email: ${mailErr.message}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`DEV ONLY: User Verification OTP for ${email} is ${otp}`);
      } else {
        return res.status(500).json({ ok: false, message: 'Could not send verification email. Please try again later.' });
      }
    }

    await redis.set(`user:verify:${id}`, otp, { EX: 60 * 15 });
    await redis.set(cooldownKey, '1', { EX: 30 });

    await supabase
      .from('users')
      .update({ verification_sent_at: new Date().toISOString() })
      .eq('id', id);

    return res.status(200).json({ ok: true, message: 'Verification OTP sent successfully' });
  } catch (error) {
    next(error);
  }
}

export async function verifyUserEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const storedOtp = await redis.get(`user:verify:${id}`);
    if (!storedOtp) {
      return res.status(400).json({ ok: false, message: 'OTP expired or not found. Please resend verification email.' });
    }

    if (storedOtp !== otp) {
      return res.status(401).json({ ok: false, message: 'Invalid OTP.' });
    }

    await redis.del(`user:verify:${id}`);

    const { data, error } = await supabase
      .from('users')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, roles(id, name)')
      .single();

    if (error || !data) {
      logger.error('Failed to update email verification status', { error });
      return res.status(500).json({ ok: false, message: 'Failed to verify email in database.' });
    }

    const { password, roles, ...rest } = data as any;
    return res.status(200).json({
      ok: true,
      data: { ...rest, role_name: roles?.name || 'USER', has_password: !!password },
      message: 'Email verified successfully!',
    });
  } catch (error) {
    next(error);
  }
}
