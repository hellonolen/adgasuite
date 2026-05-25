import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";

type CtaConfig = {
  label: string;
  href: string;
};

type MarketingHeroProps = {
  headline: string;
  headlineNode?: ReactNode;
  deck?: string;
  primaryCta?: CtaConfig;
  secondaryCta?: CtaConfig;
  /**
   * Optional content rendered inside the hero <section> after the CTAs.
   * Use for hero mocks, decorative cards, or any page-specific embellishment.
   */
  children?: ReactNode;
  /**
   * Visual variant of the hero.
   * - "default" — large display headline (homepage, /plan, /process, /cases)
   * - "compact" — smaller headline for utility pages like /pricing
   */
  variant?: "default" | "compact";
  /**
   * Optional override for section padding-bottom (in px).
   */
  paddingBottom?: number;
};

const COMPACT_HEADLINE_STYLE: CSSProperties = {
  fontSize: "clamp(38px, 5.5vw, 58px)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  margin: "0 auto 16px",
  maxWidth: "28ch",
};

const COMPACT_DECK_STYLE: CSSProperties = {
  fontSize: 17,
  lineHeight: 1.55,
  color: "var(--adga-text-2, #6b6760)",
  maxWidth: "62ch",
  margin: "0 auto 0",
};

export function MarketingHero({
  headline,
  headlineNode,
  deck,
  primaryCta,
  secondaryCta,
  children,
  variant = "default",
  paddingBottom,
}: MarketingHeroProps) {
  const isCompact = variant === "compact";

  const sectionStyle: CSSProperties | undefined =
    isCompact || paddingBottom !== undefined
      ? {
          ...(isCompact ? { padding: "72px 0 24px", textAlign: "center" as const } : {}),
          ...(paddingBottom !== undefined ? { paddingBottom } : {}),
        }
      : undefined;

  return (
    <section className="hero hero-center" style={sectionStyle}>
      {headlineNode ? (
        headlineNode
      ) : headline ? (
        isCompact ? (
          <h1 style={COMPACT_HEADLINE_STYLE}>{headline}</h1>
        ) : (
          <h1 className="hero-display">{headline}</h1>
        )
      ) : null}

      {deck ? (
        isCompact ? (
          <p style={COMPACT_DECK_STYLE}>{deck}</p>
        ) : (
          <p className="hero-lede-center">{deck}</p>
        )
      ) : null}

      {(primaryCta || secondaryCta) && (
        <div
          className="hero-ctas"
          style={
            secondaryCta
              ? { gap: 12, display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }
              : undefined
          }
        >
          {primaryCta && (
            <Link href={primaryCta.href} className="btn primary lg" prefetch>
              {primaryCta.label}
            </Link>
          )}
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="btn lg"
              style={{ background: "transparent", border: "1px solid var(--rule, #e8e4de)" }}
              prefetch
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      )}

      {children}
    </section>
  );
}
