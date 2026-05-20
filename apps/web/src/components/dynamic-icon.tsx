"use client";

import * as Icons from "lucide-react";
import { Link } from "lucide-react";

interface Props {
  name: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Renders a Lucide icon by name string. Falls back to the Link icon if the
 * name is missing or doesn't match a known icon.
 */
export function DynamicIcon({ name, className, fallback }: Props) {
  if (name) {
    const Icon = (Icons as Record<string, unknown>)[name] as
      | React.FC<{ className?: string }>
      | undefined;
    if (Icon) return <Icon className={className} />;
  }
  if (fallback) return <>{fallback}</>;
  return <Link className={className} />;
}
