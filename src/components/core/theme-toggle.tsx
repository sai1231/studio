
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDarkMode = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark")
  }

  return (
    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-sidebar-accent/80 transition-colors">
      <Switch
        id="theme-mode"
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
        className="data-[state=checked]:bg-sidebar-primary data-[state=unchecked]:bg-muted"
      />
      <Label htmlFor="theme-mode" className="text-sm text-sidebar-foreground cursor-pointer flex items-center">
        {isDarkMode ? (
          <Moon className="h-4 w-4 mr-2" />
        ) : (
          <Sun className="h-4 w-4 mr-2" />
        )}
        {isDarkMode ? "Dark Mode" : "Light Mode"}
      </Label>
    </div>
  )
}
