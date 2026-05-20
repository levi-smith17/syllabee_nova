"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface ThemeToggleProps {
  collapsed: boolean;
  className?: string;
}

export function ThemeToggle({ collapsed, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("text-sm w-full", !collapsed && "justify-start gap-3", className)}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          {!collapsed && <span>Theme</span>}
        </Button>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">Toggle theme</TooltipContent>}
    </Tooltip>
  );
}
