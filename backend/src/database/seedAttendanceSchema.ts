// backend/src/database/seedAttendanceSchema.ts
import supabase from './supabaseClient';
import fs from 'fs';
import path from 'path';

async function seed() {
  console.log('Starting Attendance Database schema setup...');
  try {
    // 1. Read the schema SQL file
    const sqlPath = path.join(__dirname, 'attendance_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Since standard supabase client might not support arbitrary SQL execution directly (unless using RPC),
    // let's try creating the tables by querying table info or executing SQL.
    // If arbitrary SQL execution isn't exposed directly, we can check if the table exists,
    // and if not, we can create them using standard Supabase RPC or check-and-log instructions.
    // However, Supabase exposes RPC for execute_sql if configured, or we can check tables via standard select limit 0.
    
    console.log('Checking if attendances table exists...');
    const { error: checkError } = await supabase
      .from('attendances')
      .select('id')
      .limit(0);

    if (checkError && checkError.code === '42P01') {
      console.log('Tables do not exist. Please execute the SQL script in your Supabase SQL Editor:');
      console.log('----------------------------------------------------');
      console.log(sql);
      console.log('----------------------------------------------------');
      
      // Let's attempt to run it via RPC if possible
      const { error: rpcError } = await supabase.rpc('exec_sql', { sql });
      if (rpcError) {
        console.log('Auto SQL execution failed (requires exec_sql RPC). Please run the SQL manually in the Supabase Dashboard.');
      } else {
        console.log('Database tables created successfully!');
      }
    } else if (checkError) {
      console.error('Error checking attendances table:', checkError);
    } else {
      console.log('Attendances table already exists.');
    }

    // 2. Create the attendance-photos storage bucket if it doesn't exist
    console.log('Creating attendance-photos storage bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
    } else {
      const bucketExists = buckets.some((b) => b.id === 'attendance-photos');
      if (!bucketExists) {
        const { data: bucketData, error: createBucketError } = await supabase.storage.createBucket('attendance-photos', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
        });

        if (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
        } else {
          console.log('attendance-photos storage bucket created successfully!', bucketData);
        }
      } else {
        console.log('attendance-photos storage bucket already exists.');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Unexpected error during schema seeding:', err);
    process.exit(1);
  }
}

seed();
