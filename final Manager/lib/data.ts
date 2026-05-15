// Types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  avatar: string
  joinDate: string
}

export interface Claim {
  id: string
  claimNumber: string
  employeeId: string
  employeeName: string
  category: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'rejected'
  description: string
  date: string
  createdAt: string
  paymentMode: string
  project: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  avatar: string
  totalClaims: number
  pendingClaims: number
  totalAmount: number
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  time: string
  read: boolean
}

// Mock Data
export const currentUser: User = {
  id: 'MGR-001',
  name: 'Rajesh Sharma',
  email: 'rajesh.sharma@company.com',
  phone: '+91 98765 43210',
  role: 'Senior Manager',
  department: 'Operations',
  avatar: 'RS',
  joinDate: 'March 2019'
}

export const mockClaims: Claim[] = [
  { 
    id: '1', 
    claimNumber: 'CLM-92834', 
    employeeId: 'EMP-1022',
    employeeName: 'Ananya Sharma', 
    category: 'Travel', 
    amount: 12450, 
    currency: '₹',
    status: 'pending', 
    description: 'Business trip to Mumbai - Flight and hotel',
    date: '2025-10-20',
    createdAt: '2025-10-24',
    paymentMode: 'Corporate Card',
    project: 'Acme Corp / Q4 Review'
  },
  { 
    id: '2', 
    claimNumber: 'CLM-92835', 
    employeeId: 'EMP-1045',
    employeeName: 'Sandeep Kumar', 
    category: 'Meals', 
    amount: 2800, 
    currency: '₹',
    status: 'pending', 
    description: 'Client dinner meeting',
    date: '2025-10-23',
    createdAt: '2025-10-23',
    paymentMode: 'Personal Card',
    project: 'Client Entertainment'
  },
  { 
    id: '3', 
    claimNumber: 'CLM-92836', 
    employeeId: 'EMP-1099',
    employeeName: 'Priya Kapoor', 
    category: 'Hotel', 
    amount: 15000, 
    currency: '₹',
    status: 'pending', 
    description: 'Hotel stay - 2 nights for client meeting',
    date: '2025-10-22',
    createdAt: '2025-10-22',
    paymentMode: 'Corporate Card',
    project: 'Sales Conference'
  },
  { 
    id: '4', 
    claimNumber: 'CLM-92837', 
    employeeId: 'EMP-1123',
    employeeName: 'Rahul Verma', 
    category: 'Fuel', 
    amount: 3500, 
    currency: '₹',
    status: 'approved', 
    description: 'Fuel expenses for field visits',
    date: '2025-10-21',
    createdAt: '2025-10-21',
    paymentMode: 'Cash',
    project: 'Field Operations'
  },
  { 
    id: '5', 
    claimNumber: 'CLM-92838', 
    employeeId: 'EMP-1156',
    employeeName: 'Divya Patel', 
    category: 'Supplies', 
    amount: 4200, 
    currency: '₹',
    status: 'rejected', 
    description: 'Office supplies - Stationery',
    date: '2025-10-20',
    createdAt: '2025-10-20',
    paymentMode: 'UPI',
    project: 'Internal Operations'
  },
  { 
    id: '6', 
    claimNumber: 'CLM-92839', 
    employeeId: 'EMP-1189',
    employeeName: 'Arjun Nair', 
    category: 'Travel', 
    amount: 8500, 
    currency: '₹',
    status: 'approved', 
    description: 'Flight tickets for team offsite',
    date: '2025-10-19',
    createdAt: '2025-10-19',
    paymentMode: 'Corporate Card',
    project: 'Team Building'
  }
]

export const mockTeamMembers: TeamMember[] = [
  { id: 'EMP-1022', name: 'Ananya Sharma', role: 'Senior Developer', department: 'Engineering', avatar: 'AS', totalClaims: 12, pendingClaims: 2, totalAmount: 124500 },
  { id: 'EMP-1045', name: 'Sandeep Kumar', role: 'Developer', department: 'Engineering', avatar: 'SK', totalClaims: 8, pendingClaims: 1, totalAmount: 45200 },
  { id: 'EMP-1099', name: 'Priya Kapoor', role: 'UI Designer', department: 'Design', avatar: 'PK', totalClaims: 6, pendingClaims: 1, totalAmount: 32800 },
  { id: 'EMP-1123', name: 'Rahul Verma', role: 'QA Engineer', department: 'Quality', avatar: 'RV', totalClaims: 5, pendingClaims: 0, totalAmount: 28500 },
  { id: 'EMP-1156', name: 'Divya Patel', role: 'Product Manager', department: 'Product', avatar: 'DP', totalClaims: 4, pendingClaims: 0, totalAmount: 42000 },
  { id: 'EMP-1189', name: 'Arjun Nair', role: 'DevOps Engineer', department: 'Engineering', avatar: 'AN', totalClaims: 3, pendingClaims: 0, totalAmount: 15800 }
]

export const mockNotifications: Notification[] = [
  { id: '1', title: '3 Claims Pending', message: 'From your team members', type: 'warning', time: '1 hour ago', read: false },
  { id: '2', title: 'Claim Approved', message: 'By Finance Department', type: 'success', time: '3 hours ago', read: false },
  { id: '3', title: 'Policy Update', message: 'Travel limits updated', type: 'info', time: '1 day ago', read: true }
]

// Dashboard stats
export const dashboardStats = {
  pendingApprovals: 3,
  teamTotal: 288800,
  approvedThisWeek: 5,
  rejectedClaims: 1,
  spendingVelocity: '+12.4%',
  avgApprovalTime: '2.1 days'
}

// Category icons mapping
export const categoryIcons: Record<string, string> = {
  Travel: 'plane',
  Meals: 'utensils',
  Hotel: 'building',
  Fuel: 'fuel',
  Supplies: 'package'
}

// Status styles
export const statusStyles = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Submitted' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  paid: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' }
}
