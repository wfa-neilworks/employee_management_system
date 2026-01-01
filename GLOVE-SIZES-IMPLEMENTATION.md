# Glove Sizes Implementation

## Overview
Added size selection functionality for Mesh Gloves (Short Mesh Gloves) with 6 color-coded sizes.

## Database Changes

### SQL Migration Required
Run the following SQL in Supabase SQL Editor:

**File: `add-glove-size-column.sql`**

This migration:
1. Creates a new `glove_size` enum with values: BROWN, GREEN, RED, WHITE, BLUE, ORANGE
2. Adds a `size` column to the `employee_gears` table
3. The size column is nullable (only required for MESH_GLOVES)

## Code Changes

### 1. Updated Files

#### `src/lib/supabase.js`
- Added `GLOVE_SIZES` constant with 6 size options

#### `src/components/modals/ManageGearsModal.jsx`
- Added `gloveSize` state to track selected size
- Displays size dropdown when Mesh Gloves are selected
- Validates that size is selected when saving Mesh Gloves
- Clears size selection when Mesh Gloves are unchecked
- Saves size to database along with gear assignment

#### `src/pages/DepartmentPage.jsx`
- Updated query to fetch `size` field from `employee_gears`
- Displays size next to gear name (e.g., "MESH GLOVES (BROWN)")

## Available Sizes
1. Brown
2. Green
3. Red
4. White
5. Blue
6. Orange

## User Experience

### Adding Gears with Sizes
1. User clicks "Manage Gears" button for an employee
2. User checks "Mesh Gloves" checkbox
3. A "Glove Size" dropdown appears below the gear checkboxes
4. User must select a size before saving
5. If user tries to save without selecting a size, an error message appears: "Please select a size for Mesh Gloves"

### Viewing Gears with Sizes
- In the department employee list, gears are displayed as badges
- Mesh Gloves will show the size in parentheses: "MESH GLOVES (BROWN)"
- Other gears display without size information

## Migration Steps

1. **Run SQL Migration**
   - Open Supabase Dashboard → SQL Editor
   - Copy content from `add-glove-size-column.sql`
   - Execute the SQL

2. **Deploy Code Changes**
   - Commit all code changes
   - Push to repository
   - Deployment will trigger automatically

3. **Fix RLS Policies (if needed)**
   - If you still have RLS errors, run `fix-employee-gears-rls.sql` in Supabase SQL Editor
   - This allows all authenticated users to manage gears

## Technical Notes

- Size is only required and stored for MESH_GLOVES gear type
- Other gear types (Helmet, Long Mesh Gloves, Mesh Apron, Gumboots) do not require size
- The size field is nullable in the database to support this flexibility
- Size validation happens on the frontend before submission
