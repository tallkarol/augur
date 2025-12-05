export async function fetchArtists(params?: { date?: string; limit?: number; period?: 'daily' | 'weekly' | 'monthly' }) {
  const searchParams = new URLSearchParams()
  if (params?.date) searchParams.set('date', params.date)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.period) searchParams.set('period', params.period)

  const res = await fetch(`/api/artists?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch artists')
  return res.json()
}

export async function fetchTracks(params?: { date?: string; limit?: number; period?: 'daily' | 'weekly' | 'monthly' }) {
  const searchParams = new URLSearchParams()
  if (params?.date) searchParams.set('date', params.date)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.period) searchParams.set('period', params.period)

  const res = await fetch(`/api/tracks?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch tracks')
  return res.json()
}

export async function fetchCharts(params?: { startDate?: string; endDate?: string; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.limit) searchParams.set('limit', params.limit.toString())

  const res = await fetch(`/api/charts?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch charts')
  return res.json()
}

export async function fetchDashboard(params?: { date?: string; period?: 'daily' | 'weekly' | 'monthly' }) {
  const searchParams = new URLSearchParams()
  if (params?.date) searchParams.set('date', params.date)
  if (params?.period) searchParams.set('period', params.period)

  const res = await fetch(`/api/dashboard?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch dashboard data')
  return res.json()
}

