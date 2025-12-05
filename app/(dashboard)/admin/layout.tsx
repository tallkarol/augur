"use client"

import { usePathname } from "next/navigation"
import { Typography } from "@/components/typography"
import Link from "next/link"
import { Settings, Upload, TrendingUp, LayoutDashboard, Download, Users } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/admin/settings",
      label: "System Settings",
      icon: Settings,
    },
    {
      href: "/admin/settings/csv-upload",
      label: "CSV Upload",
      icon: Upload,
    },
    {
      href: "/admin/settings/lead-score",
      label: "Lead Score",
      icon: TrendingUp,
    },
    {
      href: "/admin/settings/dashboard",
      label: "Dashboard Settings",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/settings/export",
      label: "Export Settings",
      icon: Download,
    },
    {
      href: "/admin/settings/tracked-artists",
      label: "Tracked Artists",
      icon: Users,
    },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-6">
        <div className="mb-8">
          <Typography variant="h2" className="text-xl font-bold">
            Admin Panel
          </Typography>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            // For the main settings page, only match exact path
            // For subpages, match if pathname starts with the href
            const isActive = item.href === "/admin/settings" 
              ? pathname === "/admin/settings"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
          <Link
                key={item.href}
                href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
                <Icon className="h-4 w-4" />
                {item.label}
          </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
