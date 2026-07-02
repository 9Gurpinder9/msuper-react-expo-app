import dotenv from 'dotenv';
dotenv.config();
import supabase from './supabaseClient';

async function check() {
  const { data, error } = await supabase.from('users').select('id, name, email').limit(2);
  if (error) {
    console.error('Users error:', error);
  } else {
    console.log('Sample Users:', data);
  }
  process.exit(0);
}
check();
