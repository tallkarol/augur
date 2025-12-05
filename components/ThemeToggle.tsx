"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 h-auto py-2 px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => {}}
      >
        <Sun className="h-5 w-5" />
        <span>Light Mode</span>
      </Button>
    )
  }

  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 h-auto py-2 px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <>
          <Moon className="h-5 w-5" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          <span>Light Mode</span>
        </>
      )}
    </Button>
  )
}
