"use client"

import { usePathname } from "next/navigation"
import { Typography } from "@/components/typography"
import Link from "next/link"
import { Settings, Database, Upload, Cog } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-6">
        <div className="mb-8">
          <Typography variant="h2" className="text-xl font-bold">
            Admin Panel
          </Typography>
        </div>
        <nav className="space-y-2">
          <Link
            href="/admin/charts"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === "/admin/charts"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Settings className="h-4 w-4" />
            Chart Configs
          </Link>
          <Link
            href="/admin/backfill"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === "/admin/backfill"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Database className="h-4 w-4" />
            Backfill Data
          </Link>
          <Link
            href="/admin/upload"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === "/admin/upload"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === "/admin/settings"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Cog className="h-4 w-4" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
