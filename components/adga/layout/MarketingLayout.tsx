"use client";

import React from "react";
import {
  BRAND,
  PRIMARY_CTA,
  SECONDARY_NAV_CTA,
  NAV_LINKS,
  FOOTER_COLUMNS,
  FOOTER_END_LINKS,
  getCopyright,
} from "@/lib/marketing-config";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 700px)").matches) return;

    const root = document.querySelector(".marketing-root");
    if (!root) return;

    root.querySelectorAll<HTMLElement>(".section, .hero-grid").forEach((el) => {
      el.classList.add("reveal");
    });
    root.querySelectorAll<HTMLElement>(".pricing, .three, .process-rail, .usecase-grid").forEach((el) => {
      el.classList.add("reveal-stagger");
    });

    const targets = root.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.08 }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [children]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="marketing-root adga-presence-crisp">
      <nav className={"nav wrap " + (menuOpen ? "nav-open" : "")}>
        <a href="/" className="brand">
          {BRAND.name}
        </a>
        <button
          className="nav-toggle"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="nav-links">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="nav-cta">
          <span className="nav-mono">{BRAND.tagline}</span>
          <a href={SECONDARY_NAV_CTA.href} className="btn" onClick={closeMenu}>
            {SECONDARY_NAV_CTA.label}
          </a>
          <a href={PRIMARY_CTA.href} className="btn primary" onClick={closeMenu}>
            {PRIMARY_CTA.label}
          </a>
        </div>
      </nav>

      {children}

      <footer className="foot wrap">
        <div className="foot-brand-area">
          <a href="/" className="brand" style={{ fontSize: 22 }}>
            {BRAND.name}
          </a>
          <p style={{ marginTop: 10, fontSize: "12.5px", color: "var(--adga-text-2)", maxWidth: "36ch" }}>
            {BRAND.footerDescription}
          </p>
        </div>
        <div className="foot-cols">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading} className="foot-col">
              <h4>{column.heading}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
      <div
        className="foot-end wrap"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}
      >
        <span>{getCopyright()}</span>
        <div style={{ display: "inline-flex", gap: 20, flexWrap: "wrap" }}>
          {FOOTER_END_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
