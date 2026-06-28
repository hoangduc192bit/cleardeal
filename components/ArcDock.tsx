"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const dockItems = [
  { id: "home", href: "/", label: "Home" },
  { id: "playground", href: "/playground", label: "Agent" },
  { id: "marketplace", href: "/marketplace", label: "Marketplace" },
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "docs", href: "/docs", label: "Developers" },
];

export function ArcDock() {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="arc-dock-wrap" aria-label="ArcStream dock navigation">
      <div className={`arc-dock`}>
        {dockItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              aria-label={item.label}
              className={`arc-dock-item ${isActive ? "arc-dock-item-current" : ""}`}
              href={item.href}
              key={item.id}
            >
              <span className={`arc-dock-label`}>
                [ {item.label} ]
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
