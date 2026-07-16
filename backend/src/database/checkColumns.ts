import dotenv from 'dotenv';
dotenv.config();
import supabase from './supabaseClient';

async function check() {
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  if (error) {
    console.error('Error fetching company:', error);
  } else {
    console.log('Sample Company Row Keys:', data?.[0] ? Object.keys(data[0]) : 'No data found');
    console.log('Sample Company Row:', data?.[0] ?? 'No rows');
  }
  process.exit(0);
}
check();
