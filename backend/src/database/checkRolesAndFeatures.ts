import dotenv from 'dotenv';
dotenv.config();
import supabase from './supabaseClient';

async function check() {
  const { data, error } = await supabase.from('roles').select('*');
  if (error) {
    console.error('Roles error:', error);
  } else {
    console.log('Existing Roles:', data);
  }
  process.exit(0);
}
check();
