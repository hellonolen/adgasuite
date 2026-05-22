"use client";

import React from "react";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="marketing-root adga-presence-crisp">
      <nav className={'nav wrap ' + (menuOpen ? 'nav-open' : '')}>
        <a href="/" className="brand">
          ADGA
        </a>
        <button
          className="nav-toggle"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          <span/>
          <span/>
          <span/>
        </button>
        <div className="nav-links">
          <a href="/product" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="/process" onClick={() => setMenuOpen(false)}>Deal Process</a>
          <a href="/cases" onClick={() => setMenuOpen(false)}>Use Cases</a>
          <a href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
        </div>
        <div className="nav-cta">
          <span className="nav-mono">Deal flow platform</span>
          <a href="/login" className="btn" onClick={() => setMenuOpen(false)}>Sign in</a>
          <a href="/pricing" className="btn primary" onClick={() => setMenuOpen(false)}>Start closing deals</a>
        </div>
      </nav>

      {children}

      <footer className="foot wrap">
        <div className="foot-brand-area">
          <a href="/" className="brand" style={{fontSize: 22}}>
            ADGA
          </a>
          <p style={{marginTop: 10, fontSize: '12.5px', color: 'var(--adga-text-2)', maxWidth: '36ch'}}>
            ADGA is the AI deal flow suite for lead capture, client work, follow-up, documents, meetings, invoices, and deal execution.
          </p>
        </div>
        <div className="foot-cols">
          <div className="foot-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="/product">Platform</a></li>
              <li><a href="/process">Deal Process</a></li>
              <li><a href="/cases">Use Cases</a></li>
              <li><a href="/pricing">Pricing</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <ul>
              <li><a href="/stories">Stories</a></li>
              <li><a href="#">Field notes</a></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="/login">Sign in</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>House</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="/pricing">Start closing deals</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="/security">Security</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">DPA</a></li>
            </ul>
          </div>
        </div>
      </footer>
      <div className="foot-end wrap">
        <span>© 2026 ADGA · All rights reserved</span>
        <span>ADGA Suite</span>
        <span>Deal flow platform</span>
      </div>
    </div>
  );
}
