export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  time: string
  read: boolean
}

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'High-value claim pending',
    message: 'Claim CLM-778210 for ₹42,500 requires verification',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Payment processed',
    message: 'Payment for CLM-77402 has been successfully processed',
    time: '15 min ago',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'New salary upload',
    message: 'Manager uploaded salary sheet for review',
    time: '1 hour ago',
    read: true,
  },
  {
    id: '4',
    type: 'error',
    title: 'Policy violation detected',
    message: 'Claim CLM-778301 exceeds daily limit',
    time: '2 hours ago',
    read: true,
  },
]

export const currentUser = {
  id: 'FIN-001',
  name: 'Finance Admin',
  email: 'finance@company.com',
  avatar: 'FA',
}
