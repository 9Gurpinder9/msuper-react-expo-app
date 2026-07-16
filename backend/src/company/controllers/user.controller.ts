import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';
import redis from '../../database/redisClient';
import { generateNumericOtp } from '../../utils/otpGenerator';
import { sendUserVerificationEmail } from '../../utils/emailSender';

// Middleware-like role validation helper
function verifyAdminRole(req: Request, res: Response): boolean {
  const role = (req as any).user?.role;
  if (role?.toUpperCase() !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden: Admin access only.' });
    return false;
  }
  return true;
}

export async function getCompanyRolesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true);
    if (error) {
      logger.error('Failed to fetch roles on company side', { error });
      return res.status(500).json({ ok: false, message: 'Failed to fetch roles.' });
    }
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCompanyUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;

    const companyId = (req as any).user.id; // companyId is stored in req.user.id for company workspace sessions
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

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

export async function createCompanyUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;

    const companyId = (req as any).user.id;
    const body = req.body;

    // 1. Verify company user creation limit
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('max_users')
      .eq('id', companyId)
      .single();

    if (companyErr || !company) {
      logger.error('Error checking company for user limit', { error: companyErr });
      return res.status(400).json({ ok: false, message: 'Company details not found or check failed.' });
    }

    const maxUsers = (company as any).max_users ?? 5;

    const { count, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (countError) {
      logger.error('Error counting company users', { error: countError });
      return res.status(500).json({ ok: false, message: 'Failed to verify company user count limit.' });
    }

    if (count !== null && count >= maxUsers) {
      return res.status(403).json({
        ok: false,
        message: `User limit reached. This company is allowed a maximum of ${maxUsers} users.`,
      });
    }

    // 2. Check for duplicate email in this company
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .ilike('email', body.email.trim().toLowerCase())
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking duplicate user', { error: checkError });
      return res.status(500).json({ ok: false, message: 'Database check failed' });
    }

    if (existing) {
      return res.status(409).json({ ok: false, message: 'A user with this email already exists in this company.' });
    }

    // 2.5 Verify assigned role is not ADMIN
    const { data: roleObj, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', body.role_id)
      .single();

    if (roleError || !roleObj) {
      logger.error('Error checking role name on user create', { error: roleError });
      return res.status(400).json({ ok: false, message: 'Invalid role selection.' });
    }

    if (roleObj.name?.toUpperCase() === 'ADMIN') {
      return res.status(400).json({ ok: false, message: 'Cannot assign ADMIN role to another user.' });
    }

    // 3. Hash password and build payload
    const hashedPassword = await bcrypt.hash(body.password.trim(), 10);
    const userPayload: any = {
      company_id: companyId,
      role_id: body.role_id,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      mobile: body.mobile.trim(),
      country_id: body.country_id,
      country_name: body.country_name.trim(),
      state_id: body.state_id,
      state_name: body.state_name.trim(),
      city_id: body.city_id,
      city_name: body.city_name.trim(),
      address: body.address.trim(),
      is_active: false, // Mandatory: Inactive by default upon registration until email is verified
      email_verified: false,
      password: hashedPassword,
    };

    // 4. Insert user
    const { data, error } = await supabase
      .from('users')
      .insert(userPayload)
      .select('*, roles(id, name)')
      .single();

    if (error || !data) {
      logger.error('Failed to create user', { error });
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

export async function updateCompanyUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;

    const companyId = (req as any).user.id;
    const { id } = req.params;
    const body = req.body;

    // Fetch user to verify they belong to this company
    const { data: currentUser, error: currentError } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('id', id)
      .single();

    if (currentError || !currentUser) {
      logger.error('Failed to find user for update', { error: currentError });
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (String(currentUser.company_id) !== String(companyId)) {
      return res.status(403).json({ ok: false, message: 'Access denied: User belongs to another company.' });
    }

    const emailChanged = currentUser.email.toLowerCase() !== body.email.trim().toLowerCase();

    // 1. Check duplicate email in this company
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .ilike('email', body.email.trim().toLowerCase());

    const duplicates = (existing || []).filter((u: any) => String(u.id) !== String(id));
    if (duplicates.length > 0) {
      return res.status(409).json({ ok: false, message: 'A user with this email already exists in this company.' });
    }

    // 1.5 Verify assigned role is not ADMIN
    const { data: roleObj, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', body.role_id)
      .single();

    if (roleError || !roleObj) {
      logger.error('Error checking role name on user update', { error: roleError });
      return res.status(400).json({ ok: false, message: 'Invalid role selection.' });
    }

    if (roleObj.name?.toUpperCase() === 'ADMIN') {
      return res.status(400).json({ ok: false, message: 'Cannot assign ADMIN role to another user.' });
    }

    if (emailChanged) {
      await redis.del(`user:verify:${id}`);
    }

    // 2. Build payload
    const updatePayload: any = {
      role_id: body.role_id,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      mobile: body.mobile.trim(),
      country_id: body.country_id,
      country_name: body.country_name.trim(),
      state_id: body.state_id,
      state_name: body.state_name.trim(),
      city_id: body.city_id,
      city_name: body.city_name.trim(),
      address: body.address.trim(),
      updated_at: new Date().toISOString(),
    };

    if (emailChanged) {
      updatePayload.email_verified = false;
      updatePayload.is_active = false; // Reset status to inactive if email changes
      updatePayload.verification_sent_at = null;
    }

    if (body.password) {
      updatePayload.password = await bcrypt.hash(body.password.trim(), 10);
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

export async function toggleUserStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;

    const companyId = (req as any).user.id;
    const { id } = req.params;
    const { is_active } = req.body;

    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', id)
      .single();

    if (checkError || !user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (String(user.company_id) !== String(companyId)) {
      return res.status(403).json({ ok: false, message: 'Access denied.' });
    }

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

export async function sendUserVerificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;

    const companyId = (req as any).user.id;
    const { id } = req.params;

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, name, email, company_id, companies(name)')
      .eq('id', id)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (String(user.company_id) !== String(companyId)) {
      return res.status(403).json({ ok: false, message: 'Access denied.' });
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

export async function verifyUserEmailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!verifyAdminRole(req, res)) return;

    const companyId = (req as any).user.id;
    const { id } = req.params;
    const { otp } = req.body;

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', id)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (String(user.company_id) !== String(companyId)) {
      return res.status(403).json({ ok: false, message: 'Access denied.' });
    }

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
        is_active: true, // Automatically activate user when email is verified!
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
      message: 'Email verified and account activated successfully!',
    });
  } catch (error) {
    next(error);
  }
}
