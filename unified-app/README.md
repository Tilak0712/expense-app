# Unified Login System for Expense Management

## Overview

This unified login system provides a single authentication portal for all 4 POV applications:
- Employee POV (final empn 2) - Port 3000
- Manager POV (final Manager) - Port 3001
- Finance POV (finance final) - Port 3002
- Super Owner POV (Super Owner) - Port 3004

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Login Portal                      │
│                  (localhost:3003)                            │
│  - Single login page                                         │
│  - Role-based authentication                                 │
│  - Session management                                        │
│  - Redirects to appropriate POV                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─→ Employee POV (3000)
                              ├─→ Manager POV (3001)
                              ├─→ Finance POV (3002)
                              └─→ Super Owner POV (3004)
```

## Database Schema

### unified_users Table

```sql
CREATE TABLE unified_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'manager', 'finance', 'super_owner')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  current_session_id UUID,
  session_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### session_audit_log Table

```sql
CREATE TABLE session_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES unified_users(id) ON DELETE CASCADE,
  old_session_id UUID,
  new_session_id UUID,
  action VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Database Setup

The migration has already been applied to your Supabase project. The `unified_users` table includes sample users:

| Employee ID | Email | Password | Role |
|-------------|-------|----------|------|
| EMP001 | employee@expensepro.com | password123 | employee |
| MGR001 | manager@expensepro.com | password123 | manager |
| FIN001 | finance@expensepro.com | password123 | finance |
| SO001 | superowner@expensepro.com | password123 | super_owner |

**⚠️ IMPORTANT**: Replace the sample passwords with properly hashed passwords using bcrypt in production.

### 2. Environment Variables

Add the following to your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://uffgmefxvcuakjczqfit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**To get your Service Role Key:**
1. Go to https://supabase.com/dashboard
2. Select your project: "Expense_Management"
3. Go to Settings → API
4. Copy the "service_role" key (not the anon key)
5. Add it to your `.env` file

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 4. Start Unified Login Server

```bash
npm run dev -- --port 3003
```

The unified login portal will be available at: http://localhost:3003/login

## Authentication Flow

### Login Process

1. User enters Employee ID and password on unified login page
2. API validates credentials against `unified_users` table
3. If valid, generates new session ID and stores in database
4. Previous session (if any) is automatically invalidated
5. User is redirected to their POV based on role
6. Session data stored in localStorage

### Session Validation

Each POV app should:
1. Check localStorage for session data
2. Validate session with unified login API (`/api/auth/validate`)
3. If invalid, redirect to unified login

### Logout Process

1. POV app calls `/api/auth/logout` with session data
2. Database clears session
3. localStorage is cleared
4. User redirected to unified login

## POV Integration Guide

### For Each POV App

1. **Copy the session-manager library** from unified-app to your POV:
   ```bash
   cp unified-app/lib/auth/session-manager.ts your-pov/lib/auth/
   ```

2. **Add session validation to your POV's login/auth logic**:
   ```typescript
   import { 
     getSessionFromStorage, 
     validateSession, 
     redirectToLogin 
   } from '@/lib/auth/session-manager'

   // Check session on app load
   const session = getSessionFromStorage()
   if (!session) {
     redirectToLogin()
     return
   }

   // Validate with server
   const result = await validateSession(session.sessionId, session.userId)
   if (!result.valid) {
     redirectToLogin()
     return
   }
   ```

3. **Add logout functionality**:
   ```typescript
   import { logoutSession, clearSessionFromStorage } from '@/lib/auth/session-manager'

   const handleLogout = async () => {
     const session = getSessionFromStorage()
     if (session) {
       await logoutSession(session.sessionId, session.userId)
     }
     clearSessionFromStorage()
     window.location.href = 'http://localhost:3003/login'
   }
   ```

4. **Remove existing login pages** from POV apps (optional):
   - Users will now authenticate through unified login
   - Keep existing auth logic as fallback if needed

## Security Features

### Single Active Session
- Each user can only have one active session at a time
- New login automatically invalidates previous session
- Session audit log tracks all session changes

### Role-Based Access Control
- Users can only access their assigned POV
- Server-side validation prevents cross-POV access
- Middleware enforces route protection

### Session Expiration
- Sessions expire after 24 hours
- Automatic cleanup of expired sessions
- Client-side and server-side validation

### Password Security
- Passwords stored as bcrypt hashes
- Never expose passwords in logs or responses
- Service role key required for database access

## API Endpoints

### POST /api/auth/login
Authenticates user and creates session.

**Request:**
```json
{
  "employeeId": "EMP001",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "employeeId": "EMP001",
    "email": "employee@expensepro.com",
    "fullName": "John Employee",
    "role": "employee"
  },
  "session": {
    "sessionId": "uuid",
    "expiresAt": "2026-04-27T18:00:00Z"
  },
  "redirectUrl": "http://localhost:3000"
}
```

### POST /api/auth/validate
Validates session and returns user data.

**Request:**
```json
{
  "sessionId": "uuid",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "employeeId": "EMP001",
    "email": "employee@expensepro.com",
    "fullName": "John Employee",
    "role": "employee"
  }
}
```

### POST /api/auth/logout
Invalidates session.

**Request:**
```json
{
  "sessionId": "uuid",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

## Testing

### Test Login Flow

1. Start unified login server: `npm run dev -- --port 3003`
2. Go to http://localhost:3003/login
3. Enter credentials:
   - Employee ID: EMP001
   - Password: password123
4. Should redirect to Employee POV (localhost:3000)

### Test Session Invalidation

1. Login from one browser/device
2. Login again from another browser/device
3. First session should be invalidated
4. Check session_audit_log for record

### Test Role-Based Routing

Test each role:
- EMP001 → Employee POV (3000)
- MGR001 → Manager POV (3001)
- FIN001 → Finance POV (3002)
- SO001 → Super Owner POV (3004)

## Troubleshooting

### "Failed to create session"
- Check SUPABASE_SERVICE_ROLE_KEY in .env
- Verify database connection
- Check unified_users table exists

### "Invalid credentials"
- Verify employee_id exists in unified_users
- Check password hash matches
- Ensure user.is_active = true

### "Session expired"
- Session expires after 24 hours
- User must login again
- Check session_expires_at in database

### POV not redirecting to login
- Check session-manager library is integrated
- Verify localStorage contains session data
- Check validateSession API call

## Production Checklist

- [ ] Replace sample passwords with bcrypt-hashed passwords
- [ ] Set up proper HTTPS for all domains
- [ ] Configure CORS for POV domains
- [ ] Set up session refresh mechanism
- [ ] Implement rate limiting on login endpoint
- [ ] Add logging and monitoring
- [ ] Set up database backups
- [ ] Configure proper error handling
- [ ] Add email verification for new users
- [ ] Implement password reset flow
- [ ] Add 2FA support (optional)
- [ ] Security audit penetration testing

## Support

For issues or questions:
1. Check database logs in Supabase dashboard
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure all POV apps are running on correct ports
