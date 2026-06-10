import dotenv from 'dotenv';
dotenv.config();
import supabase from './supabaseClient';

async function check() {
  const { data, error } = await supabase.from('company_categories').select('name');
  if (error) {
    console.error(error);
  } else {
    console.log('Existing Categories:', data.map((d: any) => d.name));
  }
  process.exit(0);
}
check();
