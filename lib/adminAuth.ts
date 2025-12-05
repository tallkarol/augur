/**
 * Admin Authentication
 * 
 * Simple password-based authentication using cookies
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'
const ADMIN_SESSION_COOKIE = 'admin_session'
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-secret-change-me'

/**
 * Check if user is authenticated as admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)
  
  if (!session) {
    return false
  }

  // Simple validation - in production, use proper session validation
  return session.value === ADMIN_SESSION_SECRET
}

/**
 * Authenticate admin with password
 */
export async function authenticateAdmin(password: string): Promise<boolean> {
  return password === ADMIN_PASSWORD
}

/**
 * Create admin session
 */
export function createAdminSession(): string {
  return ADMIN_SESSION_SECRET
}

/**
 * Clear admin session
 */
export function clearAdminSession() {
  // Session clearing handled by setting cookie to empty
}

/**
 * Middleware to protect admin routes
 */
export async function requireAdminAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)

  if (!session || session.value !== ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null // Authorized
}
