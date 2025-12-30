# Production Employee System

A web application for managing production employees, departments, gears, and locker assignments.

## Features

### HR Account
- Add new employees
- Move employees between departments
- Resign employees (soft delete)
- Assign/remove/reassign locker numbers

### Procurement Account
- Add/change/remove gears for employees

### Gears Available
- Helmet
- Mesh Gloves
- Long Mesh Gloves
- Mesh Apron
- Gumboots

### Departments
- Lamb BR
- Beef BR
- Kill Floor
- HALAL
- QA
- Loadout
- Skin Shed
- Rendering
- Cold Store
- Hook Room
- Maintenance

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the Supabase SQL script to create the database schema (see `supabase-schema.sql`)

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is configured for Vercel deployment. Simply connect your Git repository to Vercel and it will deploy automatically.

## Tech Stack

- React
- Vite
- Supabase
- Vercel
- Recharts (for charts)
