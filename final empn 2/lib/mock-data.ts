export interface User {
  id: string
  employeeId: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'finance'
  department: string
  designation: string
  manager: string
  location: string
  joinDate: string
  avatar?: string
}

export interface Claim {
  id: string
  claimNumber: string
  userId: string
  vendorName: string
  category: 'Hotel & Lodging' | 'Travel & Transport' | 'Meals & Entertainment' | 'Office Supplies' | 'Fuel'
  amount: number
  currency: string
  status: 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'Rejected' | 'Paid'
  description: string
  city: string
  gstin?: string
  paymentMode: 'Corporate Card' | 'Personal Card' | 'Cash' | 'UPI'
  projectName: string
  projectDetails: string
  expenseDate: string
  createdAt: string
  updatedAt: string
  receiptUrl?: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
}

// Mock user data
export const mockUser: User = {
  id: '1',
  employeeId: 'EMP-2847',
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@company.com',
  role: 'employee',
  department: 'Engineering',
  designation: 'Senior Software Engineer',
  manager: 'R. Sharma (MGR-001)',
  location: 'New Delhi, India',
  joinDate: 'March 2021',
}

// Mock claims data
export const mockClaims: Claim[] = [
  {
    id: '1',
    claimNumber: 'CLM-92866',
    userId: '1',
    vendorName: 'Star Hotels',
    category: 'Hotel & Lodging',
    amount: 4200,
    currency: '₹',
    status: 'Approved',
    description: 'Q4 Strategy Meeting - Client Presentation',
    city: 'Mumbai',
    gstin: '27AABCU9603R1ZM',
    paymentMode: 'Corporate Card',
    projectName: 'Project Alpha',
    projectDetails: 'Internal Operations • Q1 2026',
    expenseDate: '2026-03-12',
    createdAt: '2026-03-12T10:30:00Z',
    updatedAt: '2026-03-14T15:45:00Z',
  },
  {
    id: '2',
    claimNumber: 'CLM-92834',
    userId: '1',
    vendorName: 'Uber India',
    category: 'Travel & Transport',
    amount: 1250,
    currency: '₹',
    status: 'Pending',
    description: 'Airport Transfer - Client Meeting',
    city: 'Bangalore',
    paymentMode: 'UPI',
    projectName: 'Project Beta',
    projectDetails: 'Client Services • Q1 2026',
    expenseDate: '2026-03-10',
    createdAt: '2026-03-10T08:15:00Z',
    updatedAt: '2026-03-10T08:15:00Z',
  },
  {
    id: '3',
    claimNumber: 'CLM-92801',
    userId: '1',
    vendorName: 'Olive Garden',
    category: 'Meals & Entertainment',
    amount: 3800,
    currency: '₹',
    status: 'Submitted',
    description: 'Team Lunch - Project Completion',
    city: 'Delhi',
    paymentMode: 'Personal Card',
    projectName: 'Project Alpha',
    projectDetails: 'Internal Operations • Q1 2026',
    expenseDate: '2026-03-08',
    createdAt: '2026-03-08T14:00:00Z',
    updatedAt: '2026-03-08T14:00:00Z',
  },
  {
    id: '4',
    claimNumber: 'CLM-92756',
    userId: '1',
    vendorName: 'HP Store',
    category: 'Office Supplies',
    amount: 8500,
    currency: '₹',
    status: 'Paid',
    description: 'Wireless Mouse & Keyboard',
    city: 'Delhi',
    gstin: '07AAACH0529H1ZV',
    paymentMode: 'Corporate Card',
    projectName: 'IT Equipment',
    projectDetails: 'Infrastructure • Q1 2026',
    expenseDate: '2026-03-01',
    createdAt: '2026-03-01T11:30:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
  },
  {
    id: '5',
    claimNumber: 'CLM-92702',
    userId: '1',
    vendorName: 'Indian Oil',
    category: 'Fuel',
    amount: 2400,
    currency: '₹',
    status: 'Rejected',
    description: 'Fuel for Client Visit',
    city: 'Gurgaon',
    paymentMode: 'Cash',
    projectName: 'Project Gamma',
    projectDetails: 'Client Services • Q4 2025',
    expenseDate: '2026-02-25',
    createdAt: '2026-02-25T16:45:00Z',
    updatedAt: '2026-02-27T10:20:00Z',
  },
]

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Claim Approved',
    message: 'CLM-92866 has been approved by your manager',
    timestamp: '2026-03-14T15:45:00Z',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Pending Review',
    message: 'CLM-92834 is under review by finance team',
    timestamp: '2026-03-12T10:30:00Z',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'Policy Update',
    message: 'New travel policy effective from April 1st',
    timestamp: '2026-03-10T09:00:00Z',
    read: true,
  },
  {
    id: '4',
    type: 'error',
    title: 'Claim Rejected',
    message: 'CLM-92702 was rejected - Missing receipt',
    timestamp: '2026-02-27T10:20:00Z',
    read: true,
  },
]

// Dashboard stats
export const dashboardStats = {
  totalSubmitted: 124500,
  totalCount: 24,
  approved: 98200,
  approvedCount: 18,
  pending: 12450,
  pendingCount: 3,
  rejected: 13850,
  rejectedCount: 3,
  monthlyTotal: 45200,
  monthlyApproved: 38500,
  monthlyPending: 6700,
}

// Reports data
export const monthlySpendData = [
  { month: 'Jan', current: 85000, previous: 72000 },
  { month: 'Feb', current: 92000, previous: 78000 },
  { month: 'Mar', current: 78000, previous: 85000 },
  { month: 'Apr', current: 115000, previous: 95000 },
  { month: 'May', current: 138000, previous: 102000 },
  { month: 'Jun', current: 105000, previous: 88000 },
  { month: 'Jul', current: 112000, previous: 92000 },
  { month: 'Aug', current: 128000, previous: 98000 },
]

export const categoryDistribution = [
  { name: 'Travel', value: 40, color: 'var(--chart-1)' },
  { name: 'Fuel', value: 20, color: 'var(--chart-4)' },
  { name: 'Food', value: 15, color: 'var(--chart-2)' },
  { name: 'Hotel', value: 15, color: 'var(--chart-3)' },
  { name: 'Other', value: 10, color: 'var(--chart-5)' },
]

// Helper functions
export function formatCurrency(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: Claim['status']): string {
  switch (status) {
    case 'Approved':
    case 'Paid':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'Pending':
    case 'Submitted':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Rejected':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'Draft':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function getCategoryIcon(category: Claim['category']): string {
  switch (category) {
    case 'Hotel & Lodging':
      return 'hotel'
    case 'Travel & Transport':
      return 'directions_car'
    case 'Meals & Entertainment':
      return 'restaurant'
    case 'Office Supplies':
      return 'inventory_2'
    case 'Fuel':
      return 'local_gas_station'
    default:
      return 'receipt'
  }
}
