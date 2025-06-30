
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex w-full flex-col items-center justify-center h-[54px] gap-1 rounded-lg p-2">
        <div className="h-5 w-5 rounded-full bg-muted opacity-50" />
        <div className="h-[10px] w-8 rounded bg-muted opacity-50" />
      </div>
    )
  }

  const isDarkMode = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark")
  }

  return (
    <Button
        variant="ghost"
        onClick={toggleTheme}
        className="flex w-full flex-col items-center justify-center h-auto gap-1 rounded-lg p-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="text-[10px] font-medium leading-none">{isDarkMode ? "Light" : "Dark"}</span>
    </Button>
  )
}
