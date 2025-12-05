🧩 Folder Structure (Proposed)
/
  backend/
    src/
      ingestion/
        spotifyCsv.ts
        appleCharts.ts
      services/
        enrichSpotify.ts
        enrichApple.ts
        trendEngine.ts
        insightsEngine.ts
      routes/
        charts.ts
        search.ts
        artists.ts
      prisma/
        schema.prisma
      index.ts

  frontend/
    src/
      components/
      pages/
        Dashboard.tsx
        Artists.tsx
        Tracks.tsx
        Insights.tsx
        Importer.tsx
      lib/
        api.ts
        hooks/
        utils/

🎯 POC Priorities (You said):

Trending Artists

Cross-Platform Intelligence

Trending Tracks

We will build those first.