const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generateAdminToken() {
  const { data, error } = await supabase
    .from('super_admins')
    .select('id, email')
    .eq('email', 'gurpinderbrar495@gmail.com')
    .single();

  if (error) {
    console.error('Error fetching admin:', error);
    return;
  }

  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign(
    {
      id: data.id,
      email: data.email,
      role: 'SUPER_ADMIN',
    },
    secret,
    { expiresIn: '1d' }
  );

  console.log('GENERATED_TOKEN:', token);
}

generateAdminToken();
