"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandingPanel } from "./panels/branding";
import { LoginMethodsPanel } from "./panels/login-methods";
import { LtiPanel } from "./panels/lti";
import { SectionFormatsPanel } from "./panels/section-formats";
import { SectionRulesPanel } from "./panels/section-rules";
import { TermLengthsPanel } from "./panels/term-lengths";

// ── Data types ────────────────────────────────────────────────────────────────

interface Props {
  branding: {
    institutionName: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
  };
  entra: {
    tenantId: string;
    clientId: string;
    allowedDomain: string;
    enabled: boolean;
  };
  ltiPlatforms: { id: string; name: string; issuer: string; isActive: boolean; keyId: string | null }[];
  appUrl: string;
  formats: { id: string; label: string }[];
  sectionRules: { id: string; digit: string; formatLabel: string }[];
  termLengths: { id: string; label: string; weeks: number }[];
}

const NAV = [
  {
    group: "General",
    items: [
      { id: "branding", label: "Branding" },
    ],
  },
  {
    group: "Integrations",
    items: [
      { id: "login-methods", label: "Login Methods" },
      { id: "lti", label: "LTI Platforms" },
    ],
  },
  {
    group: "Registration",
    items: [
      { id: "section-formats", label: "Section Formats" },
      { id: "section-rules", label: "Section Rules" },
      { id: "term-lengths", label: "Term Lengths" },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

export function SettingsManager({
  branding, entra, ltiPlatforms, appUrl, termLengths, formats, sectionRules,
}: Props) {
  const [activePanel, setActivePanel] = React.useState("branding");
  const [mobileShowPanel, setMobileShowPanel] = React.useState(false);

  function selectPanel(id: string) {
    setActivePanel(id);
    setMobileShowPanel(true);
  }

  const activeLabel = ALL_ITEMS.find((i) => i.id === activePanel)?.label ?? "";

  const navItemClass = (id: string) =>
    cn(
      "w-full text-left px-3 py-2 text-sm transition-colors border-l-2",
      activePanel === id
        ? "border-sidebar-foreground bg-sidebar-foreground/10 text-sidebar-foreground font-medium"
        : "border-transparent text-foreground hover:bg-muted"
    );

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-xl text-primary font-bold leading-none shrink-0">Settings</h1>
          <p className="text-xs text-muted-foreground truncate"> — system configuration</p>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">

        {/* Left nav panel */}
        <div className={cn(
          "flex-col border overflow-y-auto md:w-52 md:shrink-0 bg-muted/40",
          mobileShowPanel ? "hidden md:flex" : "flex w-full"
        )}>
          {NAV.map((group) => (
            <div key={group.group} className="">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-primary text-background">
                {group.group}
              </p>
              {group.items.map((item) => (
                <button key={item.id} onClick={() => selectPanel(item.id)} className={navItemClass(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Right content panel */}
        <div className={cn(
          "flex-col border overflow-hidden flex-1",
          mobileShowPanel ? "flex" : "hidden md:flex"
        )}>
          {/* Mobile back button */}
          <div className="md:hidden shrink-0 border-t border-l border-r border-primary flex items-center gap-2 bg-muted/20">
            <button
              onClick={() => setMobileShowPanel(false)}
              className="flex items-center gap-2 px-4 py-2.5 w-full text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm font-medium text-foreground">Back</span>
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted/40">
            {activePanel === "branding" && <BrandingPanel initialValues={branding} />}
            {activePanel === "login-methods" && <LoginMethodsPanel initialValues={entra} />}
            {activePanel === "lti" && <LtiPanel initialPlatforms={ltiPlatforms} appUrl={appUrl} />}
            {activePanel === "section-formats" && <SectionFormatsPanel initialFormats={formats} />}
            {activePanel === "section-rules" && <SectionRulesPanel initialFormats={formats} initialRules={sectionRules} />}
            {activePanel === "term-lengths" && <TermLengthsPanel initialTermLengths={termLengths} />}
          </div>
        </div>

      </div>
    </div>
  );
}
