-- ====================================================================================
-- ADD GRANULAR PERMISSION SYSTEM
-- ====================================================================================
-- This migration adds a permissions JSONB column to the accounts table
-- and backfills existing users with permissions matching their current role.
-- Run this in Supabase SQL Editor.
-- ====================================================================================

-- Step 1: Add ADMIN to account_type enum
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'ADMIN';

-- Step 2: Add permissions JSONB column
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Step 3: Backfill existing HR users
UPDATE accounts
SET permissions = '{
  "crud_employee": true,
  "manage_employee_gear": false,
  "crud_products": false,
  "add_leave": true,
  "manage_attendance": true,
  "process_transactions": false,
  "view_knife_dockets": false,
  "view_transaction_history": false,
  "manage_users": false
}'::jsonb
WHERE account_type = 'HR';

-- Step 4: Backfill existing PROCUREMENT users
UPDATE accounts
SET permissions = '{
  "crud_employee": false,
  "manage_employee_gear": true,
  "crud_products": true,
  "add_leave": true,
  "manage_attendance": false,
  "process_transactions": false,
  "view_knife_dockets": true,
  "view_transaction_history": true,
  "manage_users": false
}'::jsonb
WHERE account_type = 'PROCUREMENT';

-- Step 5: Backfill existing ACCOUNTS users
UPDATE accounts
SET permissions = '{
  "crud_employee": false,
  "manage_employee_gear": false,
  "crud_products": false,
  "add_leave": false,
  "manage_attendance": false,
  "process_transactions": true,
  "view_knife_dockets": true,
  "view_transaction_history": true,
  "manage_users": false
}'::jsonb
WHERE account_type = 'ACCOUNTS';


-- ====================================================================================
-- PROMOTE YOUR ACCOUNT TO ADMIN
-- ====================================================================================
-- Replace 'your-email@example.com' with YOUR email address

-- UPDATE accounts
-- SET account_type = 'ADMIN',
--     permissions = '{
--       "crud_employee": true,
--       "manage_employee_gear": true,
--       "crud_products": true,
--       "add_leave": true,
--       "manage_attendance": true,
--       "process_transactions": true,
--       "view_knife_dockets": true,
--       "view_transaction_history": true,
--       "manage_users": true
--     }'::jsonb
-- WHERE email = 'your-email@example.com';
