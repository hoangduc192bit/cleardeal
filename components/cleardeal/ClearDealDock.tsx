"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Boxes,
  CircleEllipsis,
  FolderKanban,
  GitBranch,
  Home,
  ScanSearch,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const primaryItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Projects", href: "/dashboard", icon: FolderKanban },
  { label: "Workflow", href: "/how-it-works", icon: GitBranch },
  { label: "Proof", href: "/arcscan", icon: ScanSearch },
] as const;

const moreItems = [
  {
    label: "Documentation",
    description: "Product rules, wallets, files, and Arc setup.",
    href: "/docs",
    icon: BookOpenText,
  },
  {
    label: "Clearing room",
    description: "Advanced multi-party settlement proof.",
    href: "/clearing",
    icon: Boxes,
  },
] as const;

type MenuState = "closed" | "open" | "closing";

function routeIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname.startsWith(href);
}

export function ClearDealDock() {
  const pathname = usePathname();
  const [menuState, setMenuState] = useState<MenuState>("closed");
  const dockRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const menuMounted = menuState !== "closed";
  const menuOpen = menuState === "open";
  const moreActive = moreItems.some((item) =>
    routeIsActive(pathname, item.href),
  );

  function closeMenu() {
    if (!menuMounted || menuState === "closing") return;
    setMenuState("closing");
    window.clearTimeout(closeTimerRef.current);
    const closeMs =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--dropdown-close-dur",
        ),
      ) || 150;
    closeTimerRef.current = window.setTimeout(
      () => setMenuState("closed"),
      closeMs,
    );
  }

  useEffect(() => {
    setMenuState("closed");
  }, [pathname]);

  useEffect(() => {
    if (!menuMounted) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuMounted]);

  useEffect(
    () => () => window.clearTimeout(closeTimerRef.current),
    [],
  );

  return (
    <nav
      ref={dockRef}
      className="cd-dock"
      aria-label="ClearDeal product navigation"
    >
      <div className="cd-dock__rail">
        {primaryItems.map(({ label, href, icon: Icon }) => {
          const active = routeIsActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="cd-dock__item"
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
            >
              <span className="cd-dock__icon">
                <Icon aria-hidden="true" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        <span className="cd-dock__desktop-extra">
          {moreItems.map(({ label, href, icon: Icon }) => {
            const active = routeIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="cd-dock__item"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
              >
                <span className="cd-dock__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{label === "Documentation" ? "Docs" : "Clearing"}</span>
              </Link>
            );
          })}
        </span>

        <button
          type="button"
          className="cd-dock__item cd-dock__more"
          data-active={moreActive || menuOpen ? "true" : "false"}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => {
            if (menuOpen) closeMenu();
            else setMenuState("open");
          }}
        >
          <span className="cd-dock__icon">
            {menuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <CircleEllipsis aria-hidden="true" />
            )}
          </span>
          <span>More</span>
        </button>
      </div>

      {menuMounted ? (
        <div
          className={`t-dropdown cd-dock__menu ${
            menuOpen ? "is-open" : "is-closing"
          }`}
          data-origin="bottom-right"
          role="menu"
          aria-label="More ClearDeal pages"
        >
          <p className="cd-dock__menu-title">More in ClearDeal</p>
          {moreItems.map(
            ({ label, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className="cd-dock__menu-item"
              >
                <span className="cd-dock__menu-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </Link>
            ),
          )}
        </div>
      ) : null}
    </nav>
  );
}
