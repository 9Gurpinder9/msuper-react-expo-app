-- SQL Script to create attendance tables and storage bucket in Supabase

-- 1. Create attendances table
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    punch_in_time TIMESTAMPTZ NOT NULL,
    punch_in_latitude NUMERIC NOT NULL,
    punch_in_longitude NUMERIC NOT NULL,
    punch_in_location_address TEXT,
    punch_in_photo_url TEXT NOT NULL,
    
    punch_out_time TIMESTAMPTZ,
    punch_out_latitude NUMERIC,
    punch_out_longitude NUMERIC,
    punch_out_location_address TEXT,
    punch_out_photo_url TEXT,
    
    total_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for reporting performance
CREATE INDEX IF NOT EXISTS idx_attendances_company_date ON public.attendances(company_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON public.attendances(user_id, attendance_date);

-- 2. Create attendance_logs table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.attendances(id) ON DELETE CASCADE,
    log_type VARCHAR(20) NOT NULL, -- 'PUNCH_IN', 'PUNCH_OUT'
    punch_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    location_address TEXT,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_user ON public.attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_company_date ON public.attendance_logs(company_id, punch_time);

-- 3. Create attendance-photos Storage Bucket (if not exists through backend/Supabase setup)
-- In Supabase, bucket creation can be handled via the client API or client admin API.
-- We will write a seed script to run these definitions and create the storage bucket automatically.
