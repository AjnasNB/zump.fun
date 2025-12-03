-- Migration: Change launch_id from INTEGER to TEXT
-- This is needed because Starknet u256 values are too large for PostgreSQL INTEGER
-- Run this in your Supabase SQL Editor

-- Step 1: Alter the column type
ALTER TABLE token_metadata 
ALTER COLUMN launch_id TYPE TEXT USING launch_id::TEXT;

-- Step 2: Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'token_metadata' AND column_name = 'launch_id';
