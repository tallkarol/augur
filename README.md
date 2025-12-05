# Augur - Music Analytics

Intelligent charting artists and songs analytics for record labels.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Supabase account)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your credentials:
     - `DATABASE_URL` - Your Supabase PostgreSQL connection string (from Supabase Dashboard → Settings → Database → Connection string)
     - `SUPABASE_PROJECT_URL` - Your Supabase project URL (e.g., `https://xxxx.supabase.co`)
     - `SUPABASE_API_KEY` - Your Supabase anon/public key (from Supabase Dashboard → Settings → API)
     - `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` - (Optional) Spotify API credentials for metadata enrichment

3. Set up Prisma:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with dummy data
npm run db:seed
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/
  app/
    (dashboard)/          # Dashboard routes with sidebar layout
      page.tsx            # Dashboard home
      artists/            # Trending artists page
      tracks/            # Trending tracks page
      insights/          # Cross-platform intelligence
      importer/          # CSV upload interface
    api/                 # API routes
      artists/           # Artists API
      tracks/            # Tracks API
      charts/            # Charts API
  components/
    ui/                  # shadcn/ui components
    layout/              # Layout components (Sidebar)
  lib/
    api.ts              # API client functions
    db.ts               # Prisma client
    utils.ts            # Utility functions
  prisma/
    schema.prisma       # Database schema
    seed.ts             # Seed script
```

## CSV Import

CSV files should be placed in the `sample-csvs/` folder. The CSV format matches Spotify's chart export format:

- `rank` - Chart position
- `uri` - Spotify track URI
- `artist_names` - Artist name(s)
- `track_name` - Track name
- `source` - Label/distributor
- `peak_rank` - Best position achieved
- `previous_rank` - Previous position
- `days_on_chart` - Days charting
- `streams` - Stream count (optional)

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes
- `npm run db:seed` - Seed database

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add `DATABASE_URL` environment variable
4. Deploy

### Render

1. Create a new PostgreSQL database
2. Create a new Web Service
3. Connect your repository
4. Add `DATABASE_URL` environment variable
5. Deploy

## Features

- ✅ Trending Artists view
- ✅ Trending Tracks view
- ✅ Dashboard with key metrics
- ✅ Modern UI with shadcn/ui
- ✅ Responsive design
- 🚧 CSV import (coming soon)
- 🚧 Cross-platform intelligence (coming soon)
- 🚧 Advanced trend analysis (coming soon)

