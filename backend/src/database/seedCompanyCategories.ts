// backend/src/database/seedCompanyCategories.ts
import supabase from './supabaseClient';

const GENUINE_CATEGORIES = [
  'Technology & Software',
  'Healthcare & Pharmaceuticals',
  'Finance & Banking',
  'Retail & E-commerce',
  'Real Estate & Construction',
  'Education & E-learning',
  'Hospitality & Tourism',
  'Manufacturing & Logistics',
  'Food & Beverage',
  'Energy & Utilities',
];

async function seed() {
  console.log('Starting company categories seeding...');
  try {
    // 1. Fetch existing categories
    const { data: existing, error: fetchError } = await supabase
      .from('company_categories')
      .select('name');

    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      process.exit(1);
    }

    const existingNames = new Set((existing || []).map((item: { name: string }) => item.name.toLowerCase()));

    // 2. Filter categories to insert
    const toInsert = GENUINE_CATEGORIES.filter(
      (cat) => !existingNames.has(cat.toLowerCase())
    );

    if (toInsert.length === 0) {
      console.log('All company categories are already seeded.');
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
