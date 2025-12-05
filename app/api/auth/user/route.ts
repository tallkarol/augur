import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// API route to get current user
// This is a scaffold for future authentication
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[AuthAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}
