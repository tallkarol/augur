import { addDays, format, subDays } from 'date-fns'

// Generate comprehensive mock data based on CSV structure
const csvTracks = [
  { artist: "Taylor Swift", tracks: ["The Fate of Ophelia", "Opalite", "Elizabeth Taylor", "Anti-Hero"] },
  { artist: "Mariah Carey", tracks: ["All I Want for Christmas Is You"] },
  { artist: "Wham!", tracks: ["Last Christmas"] },
  { artist: "Billie Eilish", tracks: ["BIRDS OF A FEATHER", "WILDFLOWER", "ocean eyes", "lovely (with Khalid)"] },
  { artist: "Olivia Dean", tracks: ["Man I Need", "So Easy (To Fall In Love)", "Nice To Each Other", "A Couple Minutes", "Let Alone The One You Love"] },
  { artist: "Bad Bunny", tracks: ["DtMF", "BAILE INoLVIDABLE", "NUEVAYoL", "EoO", "VOY A LLeVARTE PA PR", "VeLDÁ"] },
  { artist: "The Weeknd", tracks: ["One Of The Girls", "Timeless", "Starboy", "Blinding Lights", "Die For You"] },
  { artist: "Lady Gaga", tracks: ["Die With A Smile", "Abracadabra"] },
  { artist: "Brenda Lee", tracks: ["Rockin' Around The Christmas Tree"] },
  { artist: "Djo", tracks: ["End of Beginning"] },
  { artist: "Alex Warren", tracks: ["Ordinary", "Eternity"] },
  { artist: "Bobby Helms", tracks: ["Jingle Bell Rock"] },
  { artist: "Ariana Grande", tracks: ["Santa Tell Me", "we can't be friends (wait for your love)"] },
  { artist: "RAYE", tracks: ["WHERE IS MY HUSBAND!"] },
  { artist: "Kelly Clarkson", tracks: ["Underneath the Tree", "Santa, Can't You Hear Me"] },
  { artist: "Sia", tracks: ["Snowman"] },
  { artist: "Dean Martin", tracks: ["Let It Snow! Let It Snow! Let It Snow!"] },
  { artist: "Michael Bublé", tracks: ["It's Beginning to Look a Lot like Christmas", "Holly Jolly Christmas"] },
  { artist: "sombr", tracks: ["back to friends", "undressed", "12 to 12"] },
  { artist: "HUNTR/X, EJAE, AUDREY NUNA, REI AMI, KPop Demon Hunters Cast", tracks: ["Golden", "How It's Done", "What It Sounds Like"] },
  { artist: "Sabrina Carpenter", tracks: ["Espresso", "Tears", "When Did You Get Hot?", "Taste", "Please Please Please"] },
  { artist: "Tate McRae", tracks: ["Sports car", "TIT FOR TAT", "NOBODY'S GIRL", "Just Keep Watching (From F1® The Movie)"] },
  { artist: "Gracie Abrams", tracks: ["That's So True", "I Love You, I'm Sorry"] },
  { artist: "Chappell Roan", tracks: ["Good Luck, Babe!", "Pink Pony Club"] },
  { artist: "Laufey", tracks: ["From The Start", "Winter Wonderland"] },
  { artist: "Kendrick Lamar", tracks: ["luther (with sza)", "All The Stars (with SZA)", "Not Like Us"] },
  { artist: "Fuerza Regida", tracks: ["Marlboro Rojo", "TU SANCHO", "CHAVALITAS", "COQUETA"] },
  { artist: "ROSALÍA", tracks: ["La Perla"] },
  { artist: "KATSEYE", tracks: ["Gabriela", "Gnarly"] },
  { artist: "Jin", tracks: ["Don't Say You Love Me"] },
  { artist: "The Neighbourhood", tracks: ["Sweater Weather"] },
  { artist: "Lord Huron", tracks: ["The Night We Met"] },
  { artist: "Arctic Monkeys", tracks: ["I Wanna Be Yours", "505"] },
  { artist: "Radiohead", tracks: ["Creep", "Let Down", "No Surprises"] },
  { artist: "Coldplay", tracks: ["Sparks", "Yellow", "Viva La Vida", "The Scientist"] },
  { artist: "The Goo Goo Dolls", tracks: ["Iris"] },
  { artist: "Conan Gray", tracks: ["Heather"] },
  { artist: "Tyla", tracks: ["CHANEL"] },
  { artist: "The Police", tracks: ["Every Breath You Take"] },
  { artist: "Benson Boone", tracks: ["Beautiful Things"] },
  { artist: "Jimin", tracks: ["Who"] },
  { artist: "Kate Bush", tracks: ["Running Up That Hill (A Deal With God)"] },
  { artist: "Bruno Mars", tracks: ["That's What I Like", "Locked out of Heaven", "Just the Way You Are", "When I Was Your Man", "It Will Rain"] },
  { artist: "Ed Sheeran", tracks: ["Perfect", "Photograph", "Shape of You", "Merry Christmas"] },
  { artist: "Harry Styles", tracks: ["As It Was"] },
  { artist: "OneRepublic", tracks: ["Counting Stars"] },
  { artist: "Fleetwood Mac", tracks: ["Dreams - 2004 Remaster", "The Chain - 2004 Remaster"] },
  { artist: "Linkin Park", tracks: ["In the End", "Numb"] },
  { artist: "The Killers", tracks: ["Mr. Brightside"] },
  { artist: "Twenty One Pilots", tracks: ["Stressed Out"] },
  { artist: "Lana Del Rey", tracks: ["Young And Beautiful", "Summertime Sadness", "Cinnamon Girl"] },
  { artist: "Nirvana", tracks: ["Smells Like Teen Spirit", "Come As You Are"] },
  { artist: "Guns N' Roses", tracks: ["Sweet Child O' Mine"] },
  { artist: "Oasis", tracks: ["Wonderwall - Remastered"] },
  { artist: "One Direction", tracks: ["Night Changes"] },
  { artist: "BLACKPINK", tracks: ["JUMP"] },
  { artist: "JENNIE", tracks: ["like JENNIE"] },
  { artist: "Jung Kook", tracks: ["Seven (feat. Latto)"] },
  { artist: "V", tracks: ["Winter Ahead (with PARK HYO SHIN)"] },
  { artist: "LE SSERAFIM", tracks: ["SPAGHETTI"] },
  { artist: "ILLIT", tracks: ["NOT CUTE ANYMORE"] },
]

function generateMockChartData() {
  const tracks: any[] = []
  const artists: any[] = []
  const chartEntries: any[] = []
  
  // Generate 8 weeks of daily data
  const startDate = subDays(new Date(), 56)
  const trackIdMap = new Map<string, number>()
  let trackIdCounter = 1
  let artistIdCounter = 1
  
  // Create all artists and tracks first
  csvTracks.forEach((csvData) => {
    const artistId = `artist-${artistIdCounter++}`
    artists.push({
      id: artistId,
      name: csvData.artist,
      platform: 'spotify',
    })
    
    csvData.tracks.forEach((trackName) => {
      const trackId = `track-${trackIdCounter++}`
      trackIdMap.set(`${csvData.artist}|${trackName}`, trackIdCounter - 1)
      tracks.push({
        id: trackId,
        name: trackName,
        artistId,
        artist: csvData.artist,
        platform: 'spotify',
      })
    })
  })
  
  // Generate chart entries for each day
  for (let day = 0; day < 56; day++) {
    const date = addDays(startDate, day)
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Shuffle tracks and assign positions with realistic movement
    const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5)
    
    shuffledTracks.slice(0, 200).forEach((track, index) => {
      const position = index + 1
      
      // Get previous day's position for this track
      const previousDayEntries = chartEntries.filter(
        e => e.trackId === track.id && e.date < dateStr
      )
      const previousEntry = previousDayEntries[previousDayEntries.length - 1]
      const previousRank = previousEntry ? previousEntry.position : null
      
      // Calculate realistic peak rank
      const allPreviousPositions = chartEntries
        .filter(e => e.trackId === track.id && e.date < dateStr)
        .map(e => e.position)
      const peakRank = allPreviousPositions.length > 0 
        ? Math.min(...allPreviousPositions, position)
        : position
      
      // Calculate days on chart
      const firstEntry = chartEntries.find(e => e.trackId === track.id)
      const daysOnChart = firstEntry ? day - chartEntries.indexOf(firstEntry) + 1 : 1
      
      // Generate realistic streams (higher for top positions)
      const baseStreams = Math.max(1000000, 6000000 - (position * 25000))
      const streams = Math.floor(baseStreams + (Math.random() * 1000000 - 500000))
      
      chartEntries.push({
        id: `entry-${chartEntries.length + 1}`,
        trackId: track.id,
        artistId: track.artistId,
        position,
        date: dateStr,
        platform: 'spotify',
        chartType: 'regional',
        chartPeriod: 'daily',
        peakRank,
        previousRank,
        daysOnChart,
        streams: streams.toString(),
        track: track,
        artist: artists.find(a => a.id === track.artistId),
      })
    })
  }
  
  return { tracks, artists, chartEntries }
}

export const mockData = generateMockChartData()

export function getArtistsForDate(date: string, limit: number = 50, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
  // For weekly/monthly, get entries within the period
  let entriesForDate = mockData.chartEntries.filter(e => {
    if (period === 'daily') {
      return e.date === date
    } else if (period === 'weekly') {
      // Get entries from the week containing this date
      const dateObj = new Date(date)
      const weekStart = new Date(dateObj)
      weekStart.setDate(dateObj.getDate() - dateObj.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const entryDate = new Date(e.date)
      return entryDate >= weekStart && entryDate <= weekEnd
    } else {
      // Monthly - get entries from the month
      const dateObj = new Date(date)
      const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
      const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0)
      const entryDate = new Date(e.date)
      return entryDate >= monthStart && entryDate <= monthEnd
    }
  })

  const artistMap = new Map()
  
  entriesForDate.forEach(entry => {
    const artistId = entry.artistId
    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        id: entry.artist.id,
        name: entry.artist.name,
        bestPosition: entry.position,
        currentPosition: entry.position,
        tracks: [],
        totalStreams: 0,
        positions: [],
        previousPositions: [],
      })
    }
    
    const artistData = artistMap.get(artistId)
    artistData.bestPosition = Math.min(artistData.bestPosition, entry.position)
    artistData.currentPosition = Math.min(artistData.currentPosition, entry.position)
    artistData.tracks.push({ 
      name: entry.track.name, 
      position: entry.position,
      streams: parseInt(entry.streams),
      daysOnChart: entry.daysOnChart,
    })
    artistData.totalStreams += parseInt(entry.streams)
    artistData.positions.push(entry.position)
    if (entry.previousRank) {
      artistData.previousPositions.push(entry.previousRank)
    }
  })
  
  return Array.from(artistMap.values())
    .map(data => {
      const avgPosition = data.positions.reduce((a: number, b: number) => a + b, 0) / data.positions.length
      const topTrack = data.tracks.sort((a: any, b: any) => a.position - b.position)[0]
      const longestTrack = data.tracks.sort((a: any, b: any) => (b.daysOnChart || 0) - (a.daysOnChart || 0))[0]
      
      // Calculate trend (improving = negative change, declining = positive change)
      const avgPrevious = data.previousPositions.length > 0
        ? data.previousPositions.reduce((a: number, b: number) => a + b, 0) / data.previousPositions.length
        : null
      const trend = avgPrevious ? avgPrevious - avgPosition : null
      
      return {
        id: data.id,
        name: data.name,
        bestPosition: data.bestPosition,
        currentPosition: data.currentPosition,
        averagePosition: Math.round(avgPosition * 10) / 10,
        trackCount: data.tracks.length,
        topTrack: topTrack?.name || '',
        topTrackPosition: topTrack?.position || 0,
        longestTrack: longestTrack?.name || '',
        longestTrackDays: longestTrack?.daysOnChart || 0,
        totalStreams: data.totalStreams.toString(),
        trend: trend ? Math.round(trend * 10) / 10 : null, // Positive = improving, Negative = declining
      }
    })
    .sort((a, b) => a.bestPosition - b.bestPosition)
    .slice(0, limit)
}

export function getTracksForDate(date: string, limit: number = 50) {
  const entriesForDate = mockData.chartEntries
    .filter(e => e.date === date)
    .sort((a, b) => a.position - b.position)
    .slice(0, limit)
  
  return entriesForDate.map(entry => ({
    id: entry.trackId,
    name: entry.track.name,
    artist: entry.artist.name,
    position: entry.position,
    bestPosition: entry.peakRank,
    previousPosition: entry.previousRank,
    daysOnChart: entry.daysOnChart,
    streams: entry.streams,
    change: entry.previousRank ? entry.previousRank - entry.position : null,
  }))
}

export function getChartHistory(trackId: string, startDate?: string, endDate?: string) {
  // Find track by ID or name
  const track = mockData.tracks.find(t => t.id === trackId || t.name === trackId)
  if (!track) return []
  
  let entries = mockData.chartEntries.filter(e => e.trackId === track.id)
  
  if (startDate) {
    entries = entries.filter(e => e.date >= startDate)
  }
  if (endDate) {
    entries = entries.filter(e => e.date <= endDate)
  }
  
  return entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      date: e.date,
      position: e.position,
      streams: parseInt(e.streams),
    }))
}

export function getAvailableDates() {
  const dates = [...new Set(mockData.chartEntries.map(e => e.date))].sort()
  return dates
}

export function getBiggestMovers(date: string, limit: number = 10) {
  const tracks = getTracksForDate(date, 200)
  return tracks
    .filter(t => t.change !== null && t.change > 0)
    .sort((a, b) => (b.change || 0) - (a.change || 0))
    .slice(0, limit)
}

export function getBiggestDrops(date: string, limit: number = 10) {
  const tracks = getTracksForDate(date, 200)
  return tracks
    .filter(t => t.change !== null && t.change < 0)
    .sort((a, b) => (a.change || 0) - (b.change || 0))
    .slice(0, limit)
}

export function getNewEntries(date: string, limit: number = 10) {
  const tracks = getTracksForDate(date, 200)
  return tracks
    .filter(t => t.change === null || t.previousPosition === null)
    .sort((a, b) => a.position - b.position)
    .slice(0, limit)
}

export function getTopTracksTrend(date: string, limit: number = 10) {
  return getTracksForDate(date, limit)
}

export function getTopArtistsTrend(date: string, limit: number = 10) {
  return getArtistsForDate(date, limit)
}

