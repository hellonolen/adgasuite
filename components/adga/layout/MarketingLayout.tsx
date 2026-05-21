"use client";

import React from "react";
import "../marketing.css";
import "../design-system.css";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="marketing-root adga-presence-crisp">
      <nav className="nav wrap">
        <a href="/" className="brand">
          ADGA
        </a>
        <div className="nav-links">
          <a href="/product">Product</a>
          <a href="/pricing">Pricing</a>
          <a href="/security">Security</a>
          <a href="/stories">Stories</a>
        </div>
        <div className="nav-cta">
          <span className="nav-mono">Deal flow platform</span>
          <a href="/login" className="btn">Sign in</a>
          <a href="/request-access?plan=teams" className="btn primary">Request access</a>
        </div>
      </nav>

      {children}

      <footer className="foot wrap">
        <div className="foot-brand-area">
          <div className="brand" style={{fontSize: 22}}>
            ADGA
          </div>
          <p style={{marginTop: 10, fontSize: '12.5px', color: 'var(--adga-text-2)', maxWidth: '36ch'}}>
            ADGA is the AI deal flow suite for lead capture, client work, follow-up, documents, meetings, invoices, and deal execution.
          </p>
        </div>
        <div className="foot-cols">
          <div className="foot-col">
            <h4>Product</h4>
            <ul>
              <li><a href="/product">Product</a></li>
              <li><a href="/pricing">Pricing</a></li>
              <li><a href="/security">Security</a></li>
              <li><a href="/login">Sign in</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <ul>
              <li><a href="/stories">Stories</a></li>
              <li><a href="#">Field notes</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>House</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="/#contact">Contact</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Legal</h4>
            <ul>
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
