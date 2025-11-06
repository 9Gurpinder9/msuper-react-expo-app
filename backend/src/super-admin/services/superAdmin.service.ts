import supabase from '../../database/supabaseClient';
import bcrypt from 'bcrypt';

export async function findAdminByEmail(email: string) {
  const { data, error } = await supabase
    .from('super_admins')
    .select('*')
    .eq('email', email)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function getAdminPublicByEmail(email: string) {
  const { data, error } = await supabase
    .from('super_admins')
    .select('id, email, name')
    .eq('email', email)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

