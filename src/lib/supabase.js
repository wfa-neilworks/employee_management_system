import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Constants
export const DEPARTMENTS = [
  { value: 'LAMB_BR', label: 'Lamb BR' },
  { value: 'BEEF_BR', label: 'Beef BR' },
  { value: 'KILL_FLOOR', label: 'Kill Floor' },
  { value: 'HALAL', label: 'HALAL' },
  { value: 'QA', label: 'QA' },
  { value: 'LOADOUT', label: 'Loadout' },
  { value: 'SKIN_SHED', label: 'Skin Shed' },
  { value: 'RENDERING', label: 'Rendering' },
  { value: 'COLD_STORE', label: 'Cold Store' },
  { value: 'HOOK_ROOM', label: 'Hook Room' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'CLEANING', label: 'Cleaning' }
]

export const GEARS = [
  { value: 'HELMET', label: 'Helmet' },
  { value: 'MESH_GLOVES', label: 'Mesh Gloves' },
  { value: 'LONG_MESH_GLOVES', label: 'Long Mesh Gloves' },
  { value: 'MESH_APRON', label: 'Mesh Apron' },
  { value: 'GUMBOOTS', label: 'Gumboots' }
]

export const EMPLOYMENT_STATUS = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'FULL_TIME', label: 'Full Time' }
]

export const WAGE_STATUS = [
  { value: 'WFA', label: 'WFA' },
  { value: 'LABOR_HIRE', label: 'Labor Hire' }
]

export const RESIGNATION_REASONS = [
  { value: 'RESIGN', label: 'Resign' },
  { value: 'TERMINATE', label: 'Terminate' }
]

export const LEAVE_TYPES = [
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave' },
  { value: 'LEAVE_WITHOUT_PAY', label: 'Leave Without Pay' }
]

export const GLOVE_SIZES = [
  { value: 'BROWN', label: 'Brown' },
  { value: 'GREEN', label: 'Green' },
  { value: 'RED', label: 'Red' },
  { value: 'WHITE', label: 'White' },
  { value: 'BLUE', label: 'Blue' },
  { value: 'ORANGE', label: 'Orange' }
]
