"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";

import { Search, SlidersHorizontal } from "lucide-react";
import OpportunitySearch from "@/components/opportunity/OpportunitySearch";

import { AppShell } from "@/components/AppShell";

const TABS = [
  {
    href: "/opportunities/scholarships",
    label: "Scholarships",
  },
  {
    href: "/opportunities/schemes",
    label: "Government Schemes",
  },
  {
    href: "/opportunities/internships",
    label: "Internships",
  },
  {
    href: "/opportunities/hackathons",
    label: "Hackathons",
  },
  {
    href: "/opportunities/certifications",
    label: "Certifications",
  },
  {
    href: "/opportunities/saved",
    label: "Saved Opportunities",
  },
];

export default function OpportunitiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      router.replace("/admin/opportunities");
    }
  }, [session, router]);

  if (session?.user?.role === "ADMIN") {
    return null;
  }

  return (
    <AppShell
      title="Opportunities"
      subtitle="204 opportunities open right now. 38 match your profile."
    >
      <div className="mb-4">
        <OpportunitySearch />
      </div>

      {/* Tabs */}

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-border">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (pathname === "/opportunities" &&
              tab.href ===
                "/opportunities/scholarships");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}

              {active && (
                <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>

      {children}
    </AppShell>
  );
}