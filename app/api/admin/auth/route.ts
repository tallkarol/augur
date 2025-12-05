import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin, createAdminSession } from '@/lib/adminAuth'
import { cookies } from 'next/headers'

const ADMIN_SESSION_COOKIE = 'admin_session'
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-secret-change-me'

// POST: Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      )
    }

    const isValid = await authenticateAdmin(password)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create session
    const cookieStore = await cookies()
    cookieStore.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AdminAuth] Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// DELETE: Logout
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(ADMIN_SESSION_COOKIE)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AdminAuth] Error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}

// GET: Check auth status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)
    
    const isAuthenticated = session?.value === ADMIN_SESSION_SECRET

    return NextResponse.json({ authenticated: isAuthenticated })
  } catch (error) {
    return NextResponse.json({ authenticated: false })
  }
}
