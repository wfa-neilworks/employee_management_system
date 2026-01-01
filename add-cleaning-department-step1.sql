-- Migration Step 1: Add CLEANING to enum
-- Run this first, execute it, and let it commit

ALTER TYPE department_name ADD VALUE 'CLEANING';
