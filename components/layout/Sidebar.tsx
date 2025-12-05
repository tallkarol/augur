"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Typography } from "@/components/typography"
import { 
  LayoutDashboard, 
  Users, 
  Music, 
  TrendingUp, 
  Upload 
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/tracks", label: "Tracks", icon: Music },
  { href: "/insights", label: "Insights", icon: TrendingUp },
  { href: "/importer", label: "Importer", icon: Upload },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card p-6">
      <div className="mb-8">
        <Typography variant="h2" className="text-primary">
          Augur
        </Typography>
        <Typography variant="body-sm" className="text-muted-foreground mt-1">
          Music Analytics
        </Typography>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

