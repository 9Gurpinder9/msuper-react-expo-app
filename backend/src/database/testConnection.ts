import supabase from './supabaseClient';

type CheckResult = {
  ok: boolean;
  reachable: boolean;
  status?: number;
  rows?: number;
  error?: {
    message?: string;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  };
};

/**
 * Attempts a minimal query to verify Supabase is reachable.
 * Uses a tiny select against a lightweight table. If the table
 * does not exist or permissions are restricted, we still treat
 * the instance as reachable and return details in `error`.
 */
export async function checkSupabaseConnection(): Promise<CheckResult> {
  try {
    const { data, error, status } = await supabase
      .from('test_data')
      .select('id')
      .order('id', { ascending: true })
      .limit(1);

    if (error) {
      return {
        ok: false,
        reachable: true,
        status,
        error: {
          message: error.message,
          details: (error as any).details ?? null,
          hint: (error as any).hint ?? null,
          code: (error as any).code ?? null,
        },
      };
    }

    return {
      ok: true,
      reachable: true,
      status: status ?? 200,
      rows: (data ?? []).length,
    };
  } catch (e: any) {
    return {
      ok: false,
      reachable: false,
      error: { message: e?.message || String(e) },
    };
  }
}
