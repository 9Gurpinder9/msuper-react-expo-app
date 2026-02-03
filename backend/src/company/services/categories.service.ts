import supabase from '../../database/supabaseClient';

const TABLE = 'bookmark_categories';

export async function listCategories() {
  const { data, error } = await supabase.from(TABLE).select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(name: string) {
  const { data: existing, error: existingError } = await supabase
    .from(TABLE)
    .select('id')
    .ilike('name', name)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    const err = new Error('Category name already exists.');
    (err as any).statusCode = 409;
    throw err;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ name }])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, name: string) {
  const { data: existing, error: existingError } = await supabase
    .from(TABLE)
    .select('id')
    .ilike('name', name)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0 && existing[0].id !== id) {
    const err = new Error('Category name already exists.');
    (err as any).statusCode = 409;
    throw err;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ name })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
