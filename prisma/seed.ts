import { PrismaClient } from '@prisma/client'
import { addDays, format } from 'date-fns'

const prisma = new PrismaClient()

// Sample artists and tracks data
const sampleData = [
  { artist: "Taylor Swift", tracks: ["The Fate of Ophelia", "Opalite", "Anti-Hero"] },
  { artist: "Mariah Carey", tracks: ["All I Want for Christmas Is You"] },
  { artist: "Wham!", tracks: ["Last Christmas"] },
  { artist: "Billie Eilish", tracks: ["BIRDS OF A FEATHER", "WILDFLOWER"] },
  { artist: "Olivia Dean", tracks: ["Man I Need", "So Easy (To Fall In Love)"] },
  { artist: "Bad Bunny", tracks: ["DtMF", "BAILE INoLVIDABLE"] },
  { artist: "The Weeknd", tracks: ["One Of The Girls", "Timeless"] },
  { artist: "Lady Gaga", tracks: ["Die With A Smile"] },
  { artist: "Brenda Lee", tracks: ["Rockin' Around The Christmas Tree"] },
  { artist: "Djo", tracks: ["End of Beginning"] },
  { artist: "Alex Warren", tracks: ["Ordinary"] },
  { artist: "Bobby Helms", tracks: ["Jingle Bell Rock"] },
  { artist: "Ariana Grande", tracks: ["Santa Tell Me"] },
  { artist: "RAYE", tracks: ["WHERE IS MY HUSBAND!"] },
  { artist: "Kelly Clarkson", tracks: ["Underneath the Tree"] },
  { artist: "Sia", tracks: ["Snowman"] },
  { artist: "Dean Martin", tracks: ["Let It Snow! Let It Snow! Let It Snow!"] },
  { artist: "Michael Bublé", tracks: ["It's Beginning to Look a Lot like Christmas", "Holly Jolly Christmas"] },
  { artist: "sombr", tracks: ["back to friends"] },
  { artist: "HUNTR/X, EJAE, AUDREY NUNA, REI AMI, KPop Demon Hunters Cast", tracks: ["Golden"] },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.chartEntry.deleteMany()
  await prisma.track.deleteMany()
  await prisma.artist.deleteMany()

  console.log('🗑️  Cleared existing data')

  // Create artists and tracks
  const artistsMap = new Map<string, { id: string; tracks: Array<{ id: string; name: string }> }>()

  for (const item of sampleData) {
    const artist = await prisma.artist.create({
      data: {
        name: item.artist,
        platform: 'spotify',
        externalId: `spotify:artist:${Math.random().toString(36).substring(7)}`,
      },
    })

    const tracks = []
    for (const trackName of item.tracks) {
      const track = await prisma.track.create({
        data: {
          name: trackName,
          artistId: artist.id,
          platform: 'spotify',
          uri: `spotify:track:${Math.random().toString(36).substring(7)}`,
          externalId: `spotify:track:${Math.random().toString(36).substring(7)}`,
        },
      })
      tracks.push({ id: track.id, name: track.name })
    }

    artistsMap.set(artist.id, { id: artist.id, tracks })
  }

  console.log('✅ Created artists and tracks')

  // Generate 4 weeks of daily chart data
  const startDate = addDays(new Date(), -28)
  const chartEntries = []

  for (let day = 0; day < 28; day++) {
    const date = addDays(startDate, day)
    const entriesForDay: Array<{
      trackId: string
      artistId: string
      position: number
      date: Date
      peakRank: number
      previousRank: number | null
      daysOnChart: number
      streams: bigint
    }> = []

    // Shuffle tracks for variety
    const allTracks: Array<{ trackId: string; artistId: string; name: string }> = []
    artistsMap.forEach((artistData) => {
      artistData.tracks.forEach((track) => {
        allTracks.push({
          trackId: track.id,
          artistId: artistData.id,
          name: track.name,
        })
      })
    })

    // Create realistic position movements
    allTracks.forEach((track, index) => {
      const basePosition = index + 1
      // Add some randomness to positions
      const position = Math.max(1, Math.min(200, basePosition + Math.floor(Math.random() * 20 - 10)))
      
      // Calculate previous rank (null for first day, or previous day's position)
      const previousRank = day === 0 ? null : Math.max(1, position + Math.floor(Math.random() * 10 - 5))
      
      const peakRank = Math.min(position, previousRank || position)
      const daysOnChart = day + Math.floor(Math.random() * 10)
      const streams = BigInt(Math.floor(Math.random() * 5000000) + 1000000)

      entriesForDay.push({
        trackId: track.trackId,
        artistId: track.artistId,
        position,
        date,
        peakRank,
        previousRank,
        daysOnChart,
        streams,
      })
    })

    // Sort by position
    entriesForDay.sort((a, b) => a.position - b.position)
    
    // Take top 200
    const top200 = entriesForDay.slice(0, 200)
    
    chartEntries.push(...top200.map((entry, idx) => ({
      ...entry,
      position: idx + 1, // Re-normalize positions to 1-200
    })))
  }

  // Batch insert chart entries
  await prisma.chartEntry.createMany({
    data: chartEntries.map(entry => ({
      trackId: entry.trackId,
      artistId: entry.artistId,
      position: entry.position,
      date: entry.date,
      platform: 'spotify',
      chartType: 'regional',
      chartPeriod: 'daily',
      peakRank: entry.peakRank,
      previousRank: entry.previousRank,
      daysOnChart: entry.daysOnChart,
      streams: entry.streams,
    })),
  })

  console.log(`✅ Created ${chartEntries.length} chart entries`)
  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

