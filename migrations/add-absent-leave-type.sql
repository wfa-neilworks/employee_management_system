-- Add ABSENT to leave_type enum
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'ABSENT';
