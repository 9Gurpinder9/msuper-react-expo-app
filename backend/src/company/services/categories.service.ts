import supabase from '../../database/supabaseClient';

const TABLE = 'bookmark_categories';

type ListCategoriesParams = {
  limit: number;
  offset: number;
  search?: string;
};

type ListCategoriesResult = {
  data: any[];
  total: number;
};

export async function listCategories(params: ListCategoriesParams): Promise<ListCategoriesResult> {
  const { limit, offset, search } = params;
  let query = supabase.from(TABLE).select('*', { count: 'exact' }).order('name');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return {
    data: data ?? [],
    total: count ?? 0,
  };
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
