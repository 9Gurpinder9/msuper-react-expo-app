import dotenv from 'dotenv';
dotenv.config();

import supabase from './supabaseClient';

const NEW_CATEGORIES = [
  'Agriculture & Farming',
  'Automotive & Transportation',
  'Aviation & Aerospace',
  'Biotechnology',
  'Chemicals & Materials',
  'Consulting & Professional Services',
  'Entertainment & Media',
  'Environmental Services',
  'Fashion & Apparel',
  'Government & Public Sector',
  'Insurance',
  'Legal Services',
  'Marketing & Advertising',
  'Mining & Metals',
  'Non-Profit & Charity',
  'Sports & Fitness',
  'Telecommunications',
  'Human Resources & Recruiting',
  'Security & Investigation',
  'Art & Design'
];

async function seed() {
  console.log('Starting insertion of 20 new unique categories...');
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('company_categories')
      .select('name');

    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      process.exit(1);
    }

    const existingNames = new Set((existing || []).map((item: { name: string }) => item.name.toLowerCase()));

    const toInsert = NEW_CATEGORIES.filter(
      (cat) => !existingNames.has(cat.toLowerCase())
    );

    if (toInsert.length === 0) {
      console.log('All 20 test categories are already seeded.');
      process.exit(0);
    }

    console.log(`Inserting ${toInsert.length} new categories...`);
    const rows = toInsert.map((name) => ({
      name,
      is_active: true,
    }));

    const { data, error: insertError } = await supabase
      .from('company_categories')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('Error inserting categories:', insertError);
      process.exit(1);
    }

    console.log('Seeded successfully:', data?.map((item) => item.name));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error during seeding:', err);
    process.exit(1);
  }
}

seed();
