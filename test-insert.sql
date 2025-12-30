-- Test insert to verify the format works
-- Run this first to make sure everything is set up correctly

INSERT INTO employees (name, english_name, department_id, employment_status, locker_number, start_date) VALUES
('Bui, Thi Hong Luu', '6731', (SELECT id FROM departments WHERE name = 'LAMB_BR'), 'CASUAL'::employment_status, '316', '2020-01-01'),
('Chen, Li Hong', '6616', (SELECT id FROM departments WHERE name = 'LAMB_BR'), 'CASUAL'::employment_status, NULL, '2020-01-01'),
('He, Wujie (Jay)', '6548', (SELECT id FROM departments WHERE name = 'LAMB_BR'), 'FULL_TIME'::employment_status, '172', '2020-01-01');

-- If this works, I'll create the full script for all 200+ employees
