import dotenv from 'dotenv';
dotenv.config();
import supabase from './supabaseClient';

async function check() {
  const { data, error } = await supabase.from('companies').select('id, name, owner_name, email, validity_date, expiry_date');
  if (error) {
    console.error(error);
  } else {
    console.log('Existing Companies:', data);
  }
  process.exit(0);
}
check();
