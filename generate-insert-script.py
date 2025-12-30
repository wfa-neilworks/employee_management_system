#!/usr/bin/env python3
"""
Generate SQL insert script for all employees
Run this to create the full insert script
"""

# Department mapping
DEPT_MAP = {
    'Lamb Boning': 'LAMB_BR',
    'Beef Boning': 'BEEF_BR',
    'Cold Store': 'COLD_STORE',
    'Drover': 'MAINTENANCE',  # Mapped to MAINTENANCE since Drover not in schema
    'Kill Floor': 'KILL_FLOOR',
    'Load Out': 'LOADOUT',
    'Rendering': 'RENDERING',
    'Skin Shed': 'SKIN_SHED',
    'QA': 'QA',
    'Whales': 'KILL_FLOOR',  # Mapped to KILL_FLOOR
    'Security': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'Laundry': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'Admin/Procurement': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'AAO': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'Yard': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'Sales': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'Admin-Export': 'MAINTENANCE',  # Mapped to MAINTENANCE
    'HALAL': 'HALAL'
}

# Employment status mapping
STATUS_MAP = {
    'C': 'CASUAL',
    'F': 'FULL_TIME',
    'LH': 'FULL_TIME',  # Assuming LH is full time
    'S': 'FULL_TIME'   # Assuming S is full time
}

def escape_sql(s):
    """Escape single quotes for SQL"""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

print("-- Generated INSERT script for all employees")
print("-- Run this in Supabase SQL Editor\n")

# You would paste your data here and process it
# For now, here's the template

print("""
-- Template for inserting employees:
INSERT INTO employees (name, english_name, department_id, employment_status, locker_number, start_date) VALUES
('Employee Name', 'Payroll Number', (SELECT id FROM departments WHERE name = 'DEPT_NAME'), 'CASUAL'::employment_status, 'LOCKER', 'YYYY-MM-DD');

-- To use this script:
-- 1. Replace the placeholders with actual data
-- 2. Add ::employment_status after CASUAL or FULL_TIME
-- 3. Use NULL (no quotes) for empty locker numbers
-- 4. Use (SELECT id FROM departments WHERE name = 'DEPT_NAME') for department_id
""")

print("\n-- Example for first few employees:")
print("INSERT INTO employees (name, english_name, department_id, employment_status, locker_number, start_date) VALUES")
examples = [
    ("Bui, Thi Hong Luu", "6731", "LAMB_BR", "CASUAL", "316", "2020-01-01"),
    ("Chen, Li Hong", "6616", "LAMB_BR", "CASUAL", None, "2020-01-01"),
    ("He, Wujie (Jay)", "6548", "LAMB_BR", "FULL_TIME", "172", "2020-01-01"),
]

for i, (name, number, dept, status, locker, date) in enumerate(examples):
    locker_val = f"'{locker}'" if locker else "NULL"
    comma = "," if i < len(examples) - 1 else ";"
    print(f"({escape_sql(name)}, {escape_sql(number)}, (SELECT id FROM departments WHERE name = '{dept}'), '{status}'::employment_status, {locker_val}, '{date}'){comma}")
