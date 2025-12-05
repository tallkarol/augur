"use client"

import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"

export default function ImporterPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Typography variant="h1">CSV Importer</Typography>
        <Typography variant="subtitle" className="mt-2">
          Upload Spotify CSV files to import chart data
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV Files</CardTitle>
          <CardDescription>
            Select CSV files from the sample-csvs folder or upload your own
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="flex-1"
                />
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
            <Typography variant="body-sm" className="text-muted-foreground">
              CSV import functionality coming soon. For now, use the seed script to populate the database.
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

