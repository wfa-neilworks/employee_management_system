export const PERMISSIONS = [
  { key: 'crud_employee', label: 'Manage Employees', description: 'Add, edit, and resign employees' },
  { key: 'manage_employee_gear', label: 'Manage Employee Gear', description: 'Assign protective equipment to employees' },
  { key: 'crud_products', label: 'Manage Products', description: 'Add, edit, delete knife docket products' },
  { key: 'add_leave', label: 'Manage Leave', description: 'Add and edit leave records in roster' },
  { key: 'manage_attendance', label: 'Manage Attendance', description: 'Mark attendance, mark all present' },
  { key: 'process_transactions', label: 'Process Transactions', description: 'Mark transactions as processed' },
  { key: 'view_knife_dockets', label: 'View Knife Dockets', description: 'See knife dockets section' },
  { key: 'view_transaction_history', label: 'View Transaction History', description: 'See transaction history section' },
  { key: 'manage_users', label: 'Manage Users', description: 'Access admin panel and manage user permissions' }
]

export const ALL_PERMISSIONS_ENABLED = PERMISSIONS.reduce((acc, p) => {
  acc[p.key] = true
  return acc
}, {})

export const getDefaultPermissionsForRole = (role) => {
  switch (role) {
    case 'ADMIN':
      return { ...ALL_PERMISSIONS_ENABLED }
    case 'HR':
      return { crud_employee: true, add_leave: true, manage_attendance: true }
    case 'PROCUREMENT':
      return { manage_employee_gear: true, crud_products: true, add_leave: true, view_knife_dockets: true, view_transaction_history: true }
    case 'ACCOUNTS':
      return { process_transactions: true, view_knife_dockets: true, view_transaction_history: true }
    default:
      return {}
  }
}
