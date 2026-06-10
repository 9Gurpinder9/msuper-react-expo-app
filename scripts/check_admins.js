const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAdmins() {
  const { data, error } = await supabase.from('super_admins').select('email');
  if (error) {
    console.error('Error fetching admins:', error);
  } else {
    console.log('Admins found:', data);
  }
}
checkAdmins();
