"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Typography } from "@/components/typography"
import { ThemeToggle } from "@/components/ThemeToggle"
import { 
  LayoutDashboard, 
  Users, 
  Music, 
  TrendingUp, 
  Upload,
  Settings,
  Search,
  Star
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/tracks", label: "Tracks", icon: Music },
  { href: "/tracked-artists", label: "Tracked Artists", icon: Star },
  { href: "/insights", label: "Insights", icon: TrendingUp },
  { href: "/importer", label: "Importer", icon: Upload },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  // Separate main nav items from settings
  const mainNavItems = navItems.filter(item => item.href !== '/admin/settings')
  const settingsItem = navItems.find(item => item.href === '/admin/settings')

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-6 flex flex-col h-screen">
      <div className="mb-8">
        <Typography variant="h2" className="text-primary">
          Augur
        </Typography>
        <Typography variant="body-sm" className="text-slate-600 dark:text-slate-400 mt-1">
          Music Analytics
        </Typography>
      </div>
      
      <nav className="space-y-1 flex-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      {/* Bottom section - Theme Toggle above divider */}
      <div className="mt-auto">
        <ThemeToggle />
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
          {settingsItem && (
            <Link
              href={settingsItem.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                pathname === settingsItem.href || pathname?.startsWith('/admin')
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              {settingsItem.label}
            </Link>
          )}
        </div>
      </div>
    </aside>
  )
}

