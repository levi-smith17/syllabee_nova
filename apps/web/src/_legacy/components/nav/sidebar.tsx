"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  ExternalLink,
  GraduationCap,
  Layers,
  Link as LinkIcon,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/dynamic-icon";
import { useSidebar } from "@/components/nav/sidebar-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Syllabi", href: "/editor", icon: <BookOpen className="h-5 w-5" /> },
  { label: "Internships", href: "/internship", icon: <BriefcaseBusiness className="h-5 w-5" /> },
];

const REGISTRATION_ITEMS: NavItem[] = [
  { label: "Courses", href: "/admin/courses", icon: <GraduationCap className="h-5 w-5" />, adminOnly: true },
  { label: "Terms", href: "/admin/terms", icon: <Calendar className="h-5 w-5" />, adminOnly: true },
  { label: "Sections", href: "/admin/sections", icon: <Layers className="h-5 w-5" />, adminOnly: true },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: "Users", href: "/admin/users", icon: <Users className="h-5 w-5" />, adminOnly: true },
  { label: "Quick Links", href: "/admin/quick-links", icon: <LinkIcon className="h-5 w-5" />, adminOnly: true },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" />, adminOnly: true },
];

type SidebarProps = {
  isAdmin?: boolean;
  quickLinks?: { id: string; label: string; url: string; icon: string }[];
  restrictedQuickLinks?: { id: string; label: string; url: string; icon: string }[];
};

export function Sidebar({ isAdmin, quickLinks, restrictedQuickLinks }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex-shrink-0">
        <aside
          className={cn(
            "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
            collapsed ? "w-16" : "w-56"
          )}
        >
        {/* Logo / App name */}
        <div className="flex h-14 items-center border-b px-3 gap-2">
          {!collapsed ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                className="h-7 w-7 object-contain shrink-0"
                onError={(e) => e.currentTarget.remove()}
              />
              <span className="text-lg font-bold tracking-tight text-primary truncate">
                Syllabee
              </span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/logo.png"
              alt="Syllabee"
              className="h-7 w-7 object-contain mx-auto"
              onError={(e) => e.currentTarget.remove()}
            />
          )}
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(item.href)}
              />
            ))}
          </ul>

          {/* Quick links + Staff links */}
          {(quickLinks && quickLinks.length > 0) || (restrictedQuickLinks && restrictedQuickLinks.length > 0) ? (
            <>
              <Separator className="my-2" />
              {collapsed ? (
                <CollapsedQuickLinksGroup
                  quickLinks={quickLinks ?? []}
                  restrictedQuickLinks={restrictedQuickLinks ?? []}
                />
              ) : (
                <>
                  {quickLinks && quickLinks.length > 0 && (
                    <>
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Quick Links
                      </p>
                      <ul className="space-y-1 px-2">
                        {quickLinks.map((ql) => (
                          <li key={ql.id}>
                            <a
                              href={ql.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                              <DynamicIcon name={ql.icon} className="h-4 w-4 shrink-0" />
                              <span className="truncate">{ql.label}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {restrictedQuickLinks && restrictedQuickLinks.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">
                        Staff Links
                      </p>
                      <ul className="space-y-1 px-2">
                        {restrictedQuickLinks.map((ql) => (
                          <li key={ql.id}>
                            <a
                              href={ql.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                              <DynamicIcon name={ql.icon} className="h-4 w-4 shrink-0" />
                              <span className="truncate">{ql.label}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </>
          ) : null}

          {/* Registration section */}
          {isAdmin && (
            <>
              <Separator className="my-3" />
              {!collapsed && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Registration
                </p>
              )}
              <ul className="space-y-1 px-2">
                {REGISTRATION_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                  />
                ))}
              </ul>
            </>
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              <Separator className="my-3" />
              {!collapsed && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
              )}
              <ul className="space-y-1 px-2">
                {ADMIN_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                  />
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Bottom: theme + sign out */}
        <div className="border-t p-2 flex flex-col gap-1">
          <ThemeToggle
            collapsed={collapsed}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                className={cn(
                  "text-sm w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  !collapsed && "justify-start gap-3"
                )}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sign Out</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
          </Tooltip>
        </div>
        </aside>

        {/* Double-click rail to collapse/expand */}
        <div
          onDoubleClick={toggle}
          title="Double-click to collapse"
          className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize hover:bg-primary/20 transition-colors z-10"
        />
      </div>
    </TooltipProvider>
  );
}

function CollapsedQuickLinksGroup({
  quickLinks,
  restrictedQuickLinks,
}: {
  quickLinks: { id: string; label: string; url: string; icon: string }[];
  restrictedQuickLinks: { id: string; label: string; url: string; icon: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) {
        // Check if click is inside the popout (rendered via fixed positioning outside the ref)
        const popout = document.getElementById("ql-popout");
        if (popout && !popout.contains(target)) setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="px-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={btnRef}
            onClick={handleOpen}
            className={cn(
              "flex w-full items-center justify-center rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              open && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        {!open && <TooltipContent side="right">Quick Links</TooltipContent>}
      </Tooltip>

      {open && (
        <div
          id="ql-popout"
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-50 w-52 border bg-sidebar shadow-lg py-2"
        >
          {quickLinks.length > 0 && (
            <>
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Links
              </p>
              {quickLinks.map((ql) => (
                <a
                  key={ql.id}
                  href={ql.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <DynamicIcon name={ql.icon} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{ql.label}</span>
                </a>
              ))}
            </>
          )}
          {restrictedQuickLinks.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Staff Links
              </p>
              {restrictedQuickLinks.map((ql) => (
                <a
                  key={ql.id}
                  href={ql.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <DynamicIcon name={ql.icon} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{ql.label}</span>
                </a>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground",
              collapsed && "justify-center"
            )}
          >
            {item.icon}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">{item.label}</TooltipContent>
        )}
      </Tooltip>
    </li>
  );
}
