// backend/src/company/services/attendance.service.ts
import supabase from '../../database/supabaseClient';
import logger from '../../utils/logger';

export interface PunchPayload {
  companyId: number;
  userId: number;
  latitude: number;
  longitude: number;
  photoBase64: string;
  locationAddress?: string;
}

/**
 * Decodes base64 string to buffer and uploads it to Supabase Storage bucket 'attendance-photos'
 */
async function uploadPunchPhoto(userId: number, base64Data: string, type: 'in' | 'out'): Promise<string> {
  try {
    // Clean up data prefix if it exists in the base64 string (e.g. data:image/jpeg;base64,...)
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let extension = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) extension = 'png';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    const fileName = `${userId}_${type}_${Date.now()}.${extension}`;
    const filePath = `punches/${fileName}`;

    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(filePath, buffer, {
        contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Retrieve the public URL for the uploaded photo
    const { data: publicUrlData } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    logger.error('Failed to upload punch photo to Supabase storage', err);
    throw new Error('Photo upload failed: ' + err.message);
  }
}

/**
 * Check a user's attendance status for today
 */
export async function getTodayPunchStatus(companyId: number, userId: number) {
  const todayStr = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('attendance_date', todayStr)
    .order('punch_in_time', { ascending: false });

  if (error) {
    logger.error('Failed to fetch today punch status', { error, userId });
    throw error;
  }

  if (!data || data.length === 0) return null;

  // Return the active shift (where punch_out_time is null) if one exists, otherwise the latest completed shift
  const activeShift = data.find((r) => !r.punch_out_time);
  return activeShift || data[0];
}

/**
 * Handle user Punch In flow
 */
export async function punchIn(payload: PunchPayload) {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Verify user hasn't already punched in for today and not punched out
  const existing = await getTodayPunchStatus(payload.companyId, payload.userId);
  if (existing && !existing.punch_out_time) {
    throw new Error('Already punched in. You must punch out first.');
  }

  // 1.2 Enforce 1-minute minimum cooldown between shifts (from last punch-out to new punch-in)
  if (existing && existing.punch_out_time) {
    const lastPunchOut = new Date(existing.punch_out_time);
    const nowTime = new Date();
    const diffMs = nowTime.getTime() - lastPunchOut.getTime();
    if (diffMs < 60 * 1000) {
      const secondsLeft = Math.ceil((60 * 1000 - diffMs) / 1000);
      throw new Error(`Cannot punch in yet. Please wait ${secondsLeft} more seconds.`);
    }
  }

  // 2. Upload photo to Supabase storage
  const photoUrl = await uploadPunchPhoto(payload.userId, payload.photoBase64, 'in');

  // 3. Resolve address or fallback
  const address = payload.locationAddress || `Lat: ${payload.latitude}, Lng: ${payload.longitude}`;

  const now = new Date().toISOString();

  // Insert a new shift record for today
  const { data: attendance, error: attError } = await supabase
    .from('attendances')
    .insert([
      {
        company_id: payload.companyId,
        user_id: payload.userId,
        attendance_date: todayStr,
        punch_in_time: now,
        punch_in_latitude: payload.latitude,
        punch_in_longitude: payload.longitude,
        punch_in_location_address: address,
        punch_in_photo_url: photoUrl,
        total_minutes: 0,
      },
    ])
    .select('*')
    .single();

  if (attError) {
    logger.error('Failed to save punch in record', attError);
    throw attError;
  }

  // 5. Create log entry in attendance_logs
  const { error: logError } = await supabase.from('attendance_logs').insert([
    {
      company_id: payload.companyId,
      user_id: payload.userId,
      attendance_id: attendance.id,
      log_type: 'PUNCH_IN',
      punch_time: now,
      latitude: payload.latitude,
      longitude: payload.longitude,
      location_address: address,
      photo_url: photoUrl,
    },
  ]);

  if (logError) {
    logger.error('Failed to write punch-in log audit', logError);
  }

  return attendance;
}

/**
 * Handle user Punch Out flow
 */
export async function punchOut(payload: PunchPayload) {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Verify user is currently punched in for today
  const existing = await getTodayPunchStatus(payload.companyId, payload.userId);
  if (!existing || existing.punch_out_time) {
    throw new Error('Cannot punch out. You must punch in first.');
  }

  const punchInTime = new Date(existing.punch_in_time);
  const punchOutTime = new Date();

  // Enforce 1-minute minimum shift duration cooldown
  const diffMs = punchOutTime.getTime() - punchInTime.getTime();
  if (diffMs < 60 * 1000) {
    const secondsLeft = Math.ceil((60 * 1000 - diffMs) / 1000);
    throw new Error(`Cannot punch out yet. Please wait ${secondsLeft} more seconds.`);
  }

  // 2. Upload photo to Supabase storage
  const photoUrl = await uploadPunchPhoto(payload.userId, payload.photoBase64, 'out');

  // 3. Resolve address or fallback
  const address = payload.locationAddress || `Lat: ${payload.latitude}, Lng: ${payload.longitude}`;

  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  // 4. Update attendance table
  const { data: attendance, error: attError } = await supabase
    .from('attendances')
    .update({
      punch_out_time: punchOutTime.toISOString(),
      punch_out_latitude: payload.latitude,
      punch_out_longitude: payload.longitude,
      punch_out_location_address: address,
      punch_out_photo_url: photoUrl,
      total_minutes: totalMinutes,
      updated_at: punchOutTime.toISOString(),
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (attError) {
    logger.error('Failed to save punch out record', attError);
    throw attError;
  }

  // 5. Create log entry in attendance_logs
  const { error: logError } = await supabase.from('attendance_logs').insert([
    {
      company_id: payload.companyId,
      user_id: payload.userId,
      attendance_id: existing.id,
      log_type: 'PUNCH_OUT',
      punch_time: punchOutTime.toISOString(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      location_address: address,
      photo_url: photoUrl,
    },
  ]);

  if (logError) {
    logger.error('Failed to write punch-out log audit', logError);
  }

  return attendance;
}

/**
 * Get logs history for a user on a given date (default today)
 */
export async function getAttendanceHistory(companyId: number, userId: number, dateStr?: string) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('attendance_date', targetDate)
    .order('punch_in_time', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Generate monthly overview matrix for Company Admin
 */
export async function getMonthlyReport(companyId: number, year: number, month: number) {
  const startDateStr = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDateStr = new Date(year, month, 0).toISOString().split('T')[0];

  // Fetch all users of this company
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, roles(name)')
    .eq('company_id', companyId);

  if (usersError) throw usersError;

  // Fetch all attendance entries of this month
  const { data: attendance, error: attError } = await supabase
    .from('attendances')
    .select('user_id, attendance_date, total_minutes, punch_in_time, punch_out_time')
    .eq('company_id', companyId)
    .gte('attendance_date', startDateStr)
    .lte('attendance_date', endDateStr);

  if (attError) throw attError;

  return {
    users: (users || []).map((u) => ({
      id: u.id,
      name: u.name,
      role: (u.roles as any)?.name || 'USER',
    })),
    records: attendance || [],
  };
}
