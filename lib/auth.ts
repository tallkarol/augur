// Auth utilities and types
// This is a scaffold for future authentication implementation

export interface User {
  id: string
  email: string
  name?: string
  role: 'user' | 'admin'
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
  }
}

// For now, we'll use a single default user
// In the future, this will be replaced with actual authentication
export const DEFAULT_USER: User = {
  id: 'default-user',
  email: 'user@augur.local',
  name: 'Default User',
  role: 'admin',
  preferences: {
    theme: 'light',
  },
}

// Get current user (scaffold - always returns default user for now)
export async function getCurrentUser(): Promise<User | null> {
  // TODO: Implement actual authentication
  // For now, return default user
  return DEFAULT_USER
}

// Check if user is authenticated (scaffold)
export function isAuthenticated(): boolean {
  // TODO: Implement actual authentication check
  return true
}

// Check if user is admin (scaffold)
export function isAdmin(user?: User): boolean {
  // TODO: Implement actual admin check
  return user?.role === 'admin' || true
}
