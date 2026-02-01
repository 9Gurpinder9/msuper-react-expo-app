import { checkSupabaseConnection } from './testConnection';

async function main() {
  try {
    const result = await checkSupabaseConnection();
    // Simple CLI output for quick diagnostics
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (err: any) {
    console.error(err?.message || err);
    process.exit(2);
  }
}

main();
