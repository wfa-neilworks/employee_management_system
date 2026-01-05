-- Update resignation_reason enum to include all termination types
-- This adds the new values matching the termination form

-- First, we need to add the new enum values
ALTER TYPE resignation_reason ADD VALUE IF NOT EXISTS 'RESIGNED';
ALTER TYPE resignation_reason ADD VALUE IF NOT EXISTS 'TERMINATED';
ALTER TYPE resignation_reason ADD VALUE IF NOT EXISTS 'SUMMARY_DISMISSAL';
ALTER TYPE resignation_reason ADD VALUE IF NOT EXISTS 'REDUNDANCY';
ALTER TYPE resignation_reason ADD VALUE IF NOT EXISTS 'PROBATION_NOT_CONTINUED';

-- Note: The old values 'TERMINATE' and 'RESIGN' will remain for backward compatibility
-- but new entries should use the new values
