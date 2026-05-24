"use client";

import React from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

type PolicySection = {
  heading: string;
  body: string;
};

type Policy = {
  id: string;
  label: string;
  summary: string;
  effective: string;
  updated: string;
  sections: ReadonlyArray<PolicySection>;
};

const POLICIES: ReadonlyArray<Policy> = [
  {
    id: "privacy",
    label: "Privacy Policy",
    summary:
      "What ADGA collects, why, how long it is kept, and the rights every individual has over the data inside the workspace.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Information collected",
        body: "ADGA collects the information needed to run a workspace and the deals inside it. This includes account information (name, email, workspace identifier), deal information (contacts, companies, documents, notes, calls, commitments, dates), usage information (logins, feature usage, performance metrics), and device information (browser, operating system, IP address). Information added to a deal by a workspace owner — including contacts, files, and call summaries — is processed on behalf of the workspace owner.",
      },
      {
        heading: "How information is used",
        body: "Information is used to operate the workspace, surface the next move on a deal, secure the account, deliver communications configured by the workspace owner (email, SMS), generate invoices, comply with legal obligations, and improve the platform. Information is never sold. Information is not used to build advertising profiles or shared with third parties for marketing purposes.",
      },
      {
        heading: "Lawful basis",
        body: "ADGA processes personal data under the lawful bases of contract performance (delivering the workspace subscription), legitimate interests (operating, securing, and improving the platform), legal obligation (tax, accounting, and regulatory compliance), and consent (where required for specific communications such as marketing email and SMS).",
      },
      {
        heading: "Retention",
        body: "Account information is retained for the lifetime of the workspace. Deal information is retained while the deal is active and for up to 24 months after archive, unless deletion is requested earlier. Usage and security logs are retained for up to 12 months. Backups are retained on a 35-day rolling window and overwritten thereafter. Financial records are retained for 7 years as required by applicable tax law.",
      },
      {
        heading: "Your rights",
        body: "Subjects have the right to access, correct, export, restrict, or delete the personal data ADGA holds about them, and the right to object to processing or withdraw consent at any time. Requests are submitted from inside the workspace and applied automatically. Workspace owners are responsible for honoring data subject requests that involve contacts inside their own deals; ADGA provides the export and deletion controls that make this possible.",
      },
      {
        heading: "International transfers",
        body: "ADGA is operated on Cloudflare's global infrastructure. Data may be stored or processed in any region Cloudflare operates. Transfers outside the European Economic Area, the United Kingdom, or Switzerland rely on Standard Contractual Clauses where applicable and on the supplementary measures described in the Data Processing Addendum, including encryption at rest and in transit, access controls keyed to authenticated workspace sessions, and contractual restrictions on subprocessor access.",
      },
      {
        heading: "California residents (CCPA / CPRA)",
        body: "California residents have the right to know what personal information is collected, the right to delete personal information, the right to correct inaccurate personal information, the right to opt out of the sale or sharing of personal information (ADGA does not sell or share personal information for cross-context behavioral advertising), and the right to limit the use and disclosure of sensitive personal information. Requests are submitted through the workspace.",
      },
      {
        heading: "Children",
        body: "ADGA is a business platform and is not intended for individuals under 16. ADGA does not knowingly collect information from children. If information from a child is identified, it is deleted on detection.",
      },
      {
        heading: "Changes to this policy",
        body: "Material updates to this policy are surfaced inside the workspace before they take effect, with a minimum 30-day notice. The effective date at the top of this document reflects the latest version. Continued use of the workspace after the effective date constitutes acceptance of the updated policy.",
      },
    ],
  },
  {
    id: "terms",
    label: "Terms of Service",
    summary:
      "The agreement governing access to ADGA — what the subscription includes, what is and is not permitted, and how the agreement begins, renews, or ends.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Acceptance and eligibility",
        body: "Creating a workspace constitutes acceptance of these terms. The workspace must be created and operated by an individual at least 18 years old who has the authority to bind the organization the workspace represents. ADGA may decline to provide service to any prospective workspace owner at its discretion. By creating a workspace, the workspace owner represents and warrants that the information provided is accurate, current, and complete.",
      },
      {
        heading: "Subscription and billing",
        body: "ADGA is offered on Pro, Team, and Enterprise tiers, billed monthly or annually. Subscriptions auto-renew on the cadence selected. Cancellation takes effect at the end of the current billing period; no prorated refunds are issued for partial periods, except where required by law. Past-due accounts may have access suspended after 14 days and terminated after 60 days. Taxes are calculated based on the billing address provided at the time of subscription.",
      },
      {
        heading: "Free trials and promotions",
        body: "Where ADGA offers a free trial or promotional rate, the terms of the offer are disclosed at the time of signup. At the end of a free trial period, the subscription converts to the paid tier selected unless cancelled before the trial ends. Promotional pricing applies for the duration disclosed and reverts to the standard rate on renewal.",
      },
      {
        heading: "Workspace ownership and content",
        body: "The workspace owner retains all rights to the deals, contacts, documents, and other content added to the workspace. ADGA receives a limited, non-exclusive, royalty-free license to process that content solely to deliver the service. ADGA does not claim ownership of any customer content and does not use customer content to train any model.",
      },
      {
        heading: "Acceptable use",
        body: "Use of ADGA is governed by the Acceptable Use Policy. Prohibited activities include but are not limited to: illegal content, harassment, scraping, security circumvention, reverse engineering, infringement of third-party rights, and any use that compromises the integrity of the service or the experience of other workspace owners.",
      },
      {
        heading: "Intellectual property",
        body: "All ADGA trademarks, service marks, logos, designs, and software are owned by ADGA or licensed to ADGA. No license is granted by these terms except the right to use the workspace during the term of the subscription. Reverse engineering, decompiling, or attempting to extract source code is prohibited. Feedback submitted by workspace owners may be used by ADGA without restriction or compensation.",
      },
      {
        heading: "Service availability and changes",
        body: "ADGA targets 99.9% monthly uptime, excluding scheduled maintenance and force majeure. Material reductions in functionality require 30 days' notice. Material reductions that meaningfully impair the workspace owner's use of the service entitle the workspace owner to a prorated refund of unused subscription fees. Scheduled maintenance is announced inside the workspace at least 48 hours in advance.",
      },
      {
        heading: "Warranties and disclaimers",
        body: "ADGA is provided on an \"as is\" and \"as available\" basis. Except as expressly stated in these terms, ADGA disclaims all warranties, whether express, implied, statutory, or otherwise, including warranties of merchantability, fitness for a particular purpose, and non-infringement. ADGA does not warrant that the service will be uninterrupted, error-free, or completely secure.",
      },
      {
        heading: "Limitation of liability",
        body: "To the maximum extent permitted by law, ADGA's aggregate liability arising from or related to the service in any 12-month period is limited to the subscription fees paid by the workspace owner during the 12 months preceding the event giving rise to the claim. ADGA is not liable for indirect, incidental, consequential, special, exemplary, or punitive damages, including lost profits, lost revenue, lost data, or business interruption.",
      },
      {
        heading: "Indemnification",
        body: "The workspace owner agrees to indemnify and hold harmless ADGA from any claims, damages, losses, liabilities, costs, and expenses arising from (i) the workspace owner's content, (ii) the workspace owner's use of the service in violation of these terms or applicable law, (iii) the workspace owner's violation of third-party rights, or (iv) the workspace owner's failure to obtain required consents from contacts added to the workspace.",
      },
      {
        heading: "Termination",
        body: "Either party may terminate the agreement at any time. Termination by the workspace owner stops auto-renewal at the end of the current billing period. Termination by ADGA for material breach of these terms takes effect on the date stated in the termination notice. On termination, the workspace owner has 30 days to export deal data before it is permanently deleted.",
      },
      {
        heading: "Governing law and disputes",
        body: "These terms are governed by the laws of the State of Delaware, United States, without regard to conflicts-of-law principles. Disputes are resolved through binding arbitration in Wilmington, Delaware under the rules of the American Arbitration Association. Class actions are waived. Either party may seek injunctive relief in a court of competent jurisdiction for breach of intellectual property rights.",
      },
    ],
  },
  {
    id: "acceptable-use",
    label: "Acceptable Use",
    summary:
      "What is permitted and what is prohibited inside an ADGA workspace.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Prohibited content",
        body: "Workspaces may not be used to store, send, or process content that is illegal, infringing, defamatory, fraudulent, deceptive, harassing, threatening, hateful, sexually explicit involving minors, or designed to distribute malware. Content related to weapons of mass destruction, illegal drug trafficking, child exploitation, or terrorism is grounds for immediate termination without notice.",
      },
      {
        heading: "Prohibited behavior",
        body: "Workspaces may not be used to send unsolicited bulk communications, scrape data from the platform or third parties, circumvent security or rate limits, reverse engineer the platform, impersonate other individuals or organizations, conduct security testing without prior written authorization, or interfere with the experience of other workspace owners.",
      },
      {
        heading: "Authorized communications",
        body: "Outbound email and SMS sent through ADGA must comply with the Email Policy and SMS Policy. The workspace owner is responsible for collecting and documenting prior consent for every recipient. ADGA monitors send rates, bounce rates, and complaint rates and may suspend send capability that exceeds carrier or industry thresholds.",
      },
      {
        heading: "Data ownership and integrity",
        body: "The workspace owner is responsible for the accuracy, completeness, and lawful basis of every record added to the workspace. Workspaces may not be used to circumvent consumer protection laws, debt collection regulations, telemarketing rules, or any other regulation governing the use of personal data for outreach.",
      },
      {
        heading: "Workspace integrity",
        body: "Workspaces must not be used to disrupt the service, including but not limited to: distributed denial of service attacks, intentional overload of platform resources, exploitation of bugs that have not been responsibly disclosed, or any action that degrades the experience of other workspace owners.",
      },
      {
        heading: "Reporting and enforcement",
        body: "Violations are detected through automated monitoring and through reports filed through the workspace. Confirmed violations may result in content removal, send suspension, workspace suspension, or termination, depending on severity and recurrence. Repeat or severe violations are reported to law enforcement where appropriate.",
      },
    ],
  },
  {
    id: "data-processing",
    label: "Data Processing",
    summary:
      "How ADGA processes personal data on behalf of the workspace owner under GDPR, UK GDPR, and CCPA.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Roles",
        body: "For deal data and contact data added by the workspace owner, the workspace owner is the controller and ADGA is the processor. For account data and platform usage data, ADGA is the controller. This Addendum governs the processor relationship for deal and contact data.",
      },
      {
        heading: "Scope and purpose",
        body: "ADGA processes deal and contact data only to deliver the platform — including storing the deal record, surfacing the next action, sending communications configured by the workspace owner, and generating reports. ADGA does not process customer data for any independent purpose, does not sell customer data, and does not use customer data to train any model.",
      },
      {
        heading: "Categories of data",
        body: "Personal data processed on behalf of the workspace owner includes: contact identifiers (name, email, phone), professional information (job title, company, role), communication records (emails, calls, meeting notes), documents (proposals, contracts, attachments), and any custom fields the workspace owner configures.",
      },
      {
        heading: "Subprocessors",
        body: "A current list of subprocessors is maintained in the Subprocessors section. Material changes to the subprocessor list — including additions of subprocessors that process personal data — are surfaced inside the workspace at least 30 days before they take effect, with a right to object during that window.",
      },
      {
        heading: "Security measures",
        body: "ADGA maintains administrative, technical, and physical safeguards designed to protect deal and contact data. Specific measures include encryption in transit (TLS 1.3), encryption at rest (AES-256), access controls keyed to the workspace, audit logging, and an annual penetration test conducted by an independent third party. Further detail is provided in the Security Policy.",
      },
      {
        heading: "Data subject requests",
        body: "Requests from data subjects to access, correct, port, or delete their information are handled by the workspace owner using the controls inside the workspace. ADGA provides export and deletion functions that allow the workspace owner to respond to requests within the deadlines required by applicable law.",
      },
      {
        heading: "Breach notification",
        body: "Confirmed personal data breaches are reported to affected workspace owners without undue delay and in no event later than 72 hours after confirmation. The notification includes the nature of the breach, the categories and approximate number of records affected, the likely consequences, and the measures taken or proposed to address the breach.",
      },
      {
        heading: "International transfers",
        body: "Transfers of personal data outside the EEA, UK, or Switzerland rely on the Standard Contractual Clauses (Module 2 — controller to processor) where the Addendum is signed with a controller in those regions. Supplementary measures include encryption at rest, encryption in transit, and access controls that prevent personnel from accessing the content of customer data without an authenticated workspace session.",
      },
      {
        heading: "Audit rights",
        body: "Workspace owners may audit ADGA's compliance with this Addendum once per calendar year. Audits are conducted through ADGA's submission of its most recent SOC 2 Type II report or equivalent third-party attestation. On-site audits are permitted in cases of confirmed breach, on reasonable notice, at the workspace owner's cost.",
      },
      {
        heading: "Return and deletion",
        body: "On termination of the workspace, ADGA returns all customer data on request and deletes any remaining copies within 30 days, except where retention is required by law. Backups containing customer data are overwritten on the standard 35-day backup cycle.",
      },
    ],
  },
  {
    id: "subprocessors",
    label: "Subprocessors",
    summary:
      "The third-party services ADGA relies on to deliver the platform, the role of each, and the data each receives.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Hosting and infrastructure",
        body: "Cloudflare (Workers, D1, R2, Durable Objects) — global hosting and storage of workspace data, deal records, documents, and metadata. Region: global. Data: all workspace content. Encryption: TLS 1.3 in transit, AES-256 at rest. Cloudflare maintains SOC 2 Type II, ISO 27001, and PCI DSS attestations.",
      },
      {
        heading: "Email delivery",
        body: "Postmark (Wildbit, LLC) — transactional email delivery for receipts, invoices, meeting invites, and outbound email configured by the workspace owner. Region: United States. Data: recipient email address, subject, body, send metadata. Postmark maintains SOC 2 Type II attestation.",
      },
      {
        heading: "SMS delivery",
        body: "Self-hosted open-source SMS gateway adapter — outbound SMS delivery for messages configured by the workspace owner. Region: as configured by the workspace owner. Data: recipient phone number, message body, send metadata. The gateway is self-hosted; no third-party SMS provider receives message content.",
      },
      {
        heading: "Payments",
        body: "Payment processor — subscription billing, checkout, invoicing, and payment processing. Region: United States. Data: workspace owner name, email, billing address, subscription tier, payment method tokens, invoices, and payment status.",
      },
      {
        heading: "Analytics and monitoring",
        body: "Cloudflare Web Analytics — privacy-first website analytics on the marketing site. Region: global. Data: page view counts, referrer, browser, device class. No cookies, no fingerprinting, no individual tracking. Cloudflare maintains SOC 2 Type II attestation.",
      },
      {
        heading: "Authentication",
        body: "Magic-link delivery is handled through Postmark. No third-party authentication provider stores workspace credentials. Single sign-on integrations with Google Workspace and Microsoft Entra are available on Enterprise; for SSO workspaces, the identity provider is the source of truth for authentication, not ADGA.",
      },
      {
        heading: "Notification of changes",
        body: "Additions or replacements of any subprocessor that processes personal data are surfaced inside the workspace at least 30 days before they take effect. Workspace owners have a right to object to a new subprocessor during that 30-day window; objections that cannot be resolved entitle the workspace owner to terminate the affected subscription with a prorated refund.",
      },
    ],
  },
  {
    id: "sms",
    label: "SMS Policy",
    summary:
      "How ADGA sends SMS messages from a workspace — consent, content rules, opt-out handling, and carrier compliance.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Consent required",
        body: "SMS messages may only be sent to recipients who have provided prior express written consent. Consent must be unambiguous, freely given, and documented. Pre-checked opt-in boxes, implied consent, and contact list imports without consent records are not sufficient. The workspace owner is responsible for documenting consent for every recipient and for producing the consent record on request.",
      },
      {
        heading: "Identification and disclosure",
        body: "Every SMS sent through ADGA must clearly identify the sender by business name, must disclose the purpose of the message, and must include opt-out instructions in the first message of every campaign. The standard opt-out instructions are: \"Reply STOP to opt out. Reply HELP for help.\" Message and data rates may apply.",
      },
      {
        heading: "Opt-out handling",
        body: "ADGA processes opt-out replies — STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT — automatically. Once a recipient opts out, no further SMS is sent to that recipient from the workspace unless the recipient explicitly re-opts in. The opt-out list is maintained at the workspace level and is enforced across every campaign and ad-hoc send. Opt-out confirmation messages comply with carrier requirements.",
      },
      {
        heading: "Content rules",
        body: "SMS may not contain content that is illegal, deceptive, threatening, harassing, sexually explicit, related to controlled substances or firearms, related to high-risk financial services (payday loans, gambling, debt consolidation) without separate carrier approval, or that violates the Acceptable Use Policy. Shortened URLs from public link shorteners (bit.ly, tinyurl) are not permitted; branded shortlinks tied to the workspace domain are.",
      },
      {
        heading: "Carrier compliance",
        body: "Outbound SMS through ADGA is sent through a self-hosted gateway adapter and is subject to the rules of the underlying carrier. In the United States, this includes the Telephone Consumer Protection Act (TCPA), the CAN-SPAM Act as applied to mobile, and the CTIA Messaging Principles and Best Practices. In Canada, CASL applies. In the EU and UK, GDPR and PECR apply. Workspace owners are responsible for compliance in every jurisdiction they send to.",
      },
      {
        heading: "Quiet hours and frequency",
        body: "SMS may not be sent between 9 PM and 8 AM in the recipient's local time zone, except where the recipient has explicitly opted in to messages during those hours. Campaign frequency is governed by the disclosure made at the time of consent; exceeding the disclosed frequency requires fresh consent.",
      },
      {
        heading: "Monitoring and enforcement",
        body: "ADGA monitors send rates, opt-out rates, complaint rates, and carrier feedback. Workspaces that exceed industry thresholds for any of these metrics have send capability suspended automatically until the issue is investigated and resolved. Repeated violations of this policy may result in permanent loss of SMS send capability and termination of the workspace.",
      },
    ],
  },
  {
    id: "email",
    label: "Email Policy",
    summary:
      "How ADGA sends transactional and customer-facing email — authentication, unsubscribe handling, and CAN-SPAM compliance.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Sender authentication",
        body: "All outbound email is sent through Postmark and is authenticated with SPF, DKIM, and DMARC. Workspace owners sending from their own custom domain configure DNS records that align with the Postmark sending server. Sends from a domain that fails authentication are blocked. BIMI is supported where the workspace owner provides a verified mark certificate.",
      },
      {
        heading: "Unsubscribe and suppression",
        body: "Every marketing or campaign email sent through the workspace includes a one-click unsubscribe link, in compliance with the Gmail and Yahoo bulk sender requirements. Unsubscribes are added to a workspace-level suppression list automatically and enforced across every subsequent campaign. Transactional emails — receipts, invoices, meeting invites, account notifications — are exempt from the unsubscribe requirement under CAN-SPAM but must remain transactional in content.",
      },
      {
        heading: "Content rules",
        body: "Emails sent through ADGA must accurately identify the sender, must not contain deceptive subject lines, must not use misleading From or Reply-To headers, must include a valid physical postal address in the footer, and must comply with the Acceptable Use Policy. Subject lines must accurately reflect the content of the message.",
      },
      {
        heading: "Bounce and complaint handling",
        body: "Hard bounces are added to the suppression list automatically. Soft bounces are retried according to Postmark's default schedule and then suppressed. Spam complaints from recipient mailboxes (via feedback loops with Gmail, Yahoo, Microsoft, and AOL) result in immediate suppression of the recipient and a notification surfaced inside the workspace.",
      },
      {
        heading: "Volume and reputation",
        body: "ADGA monitors send volume, open rates, click rates, bounce rates, and complaint rates per workspace. Workspaces whose metrics fall outside acceptable industry ranges have send rates throttled or suspended until the issue is resolved. Reputation is a shared asset across the platform; degradation by one workspace affects every workspace, and is addressed quickly.",
      },
      {
        heading: "List acquisition",
        body: "Imported contact lists must be lists the workspace owner has the lawful right to email. Purchased lists, scraped lists, and lists obtained without consent are not permitted. ADGA may require documentation of the list source and the consent mechanism before enabling bulk sends.",
      },
    ],
  },
  {
    id: "cookies",
    label: "Cookie Policy",
    summary:
      "What cookies and similar technologies ADGA uses on the marketing site and inside the workspace.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Strictly necessary cookies",
        body: "ADGA uses strictly necessary cookies to keep workspace owners signed in, to remember session preferences, and to protect against CSRF and other security attacks. These cookies are set on every visit and cannot be disabled without breaking workspace functionality. Strictly necessary cookies do not require consent under GDPR.",
      },
      {
        heading: "Functional cookies",
        body: "Functional cookies remember non-essential preferences — such as theme selection, sidebar collapse state, and last-visited workspace section. These cookies improve the experience but are not required to use the workspace.",
      },
      {
        heading: "Analytics cookies",
        body: "The marketing site uses Cloudflare Web Analytics, which does not set cookies and does not perform individual tracking. The workspace uses first-party analytics cookies to measure feature usage in aggregate, used to inform product improvements. No third-party analytics cookies are set.",
      },
      {
        heading: "Marketing cookies",
        body: "ADGA does not set advertising cookies, retargeting cookies, or third-party marketing cookies on the marketing site or inside the workspace. ADGA does not participate in any cross-site advertising network.",
      },
      {
        heading: "Cookie duration",
        body: "Session cookies are deleted when the browser is closed. Persistent cookies have a lifetime ranging from 30 days (preference cookies) to 1 year (analytics aggregates). No cookie set by ADGA persists for longer than 12 months.",
      },
      {
        heading: "Managing preferences",
        body: "Cookie preferences can be managed in any modern browser through the browser's settings. Workspace owners can clear cookies at any time. Clearing strictly necessary cookies will require signing in again on the next visit. Browsers also support Do Not Track and Global Privacy Control signals; ADGA respects these signals where they apply.",
      },
    ],
  },
  {
    id: "security",
    label: "Security Policy",
    summary:
      "How ADGA encrypts, controls access to, audits, and protects data inside every workspace.",
    effective: "March 1, 2026",
    updated: "May 24, 2026",
    sections: [
      {
        heading: "Encryption",
        body: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Encryption keys are managed by Cloudflare's key management service. Document bytes stored in Cloudflare R2 are encrypted with envelope encryption. Database fields containing sensitive information are encrypted at the application layer in addition to at-rest encryption.",
      },
      {
        heading: "Access controls",
        body: "Access to a workspace is scoped to authenticated workspace members. Workspace permissions follow a least-privilege model with role-based access controls. Enterprise workspaces support custom roles, single sign-on (SAML, OIDC), SCIM provisioning, and IP allowlists. Service-to-service access uses scoped credentials with automatic rotation.",
      },
      {
        heading: "Authentication",
        body: "ADGA uses magic-link authentication by default. Multi-factor authentication is required for Enterprise workspaces and available on Pro and Team. Sessions expire after 30 days of inactivity. Failed authentication attempts are rate-limited and trigger account lockout after a defined threshold. Passwords, where used, must meet minimum complexity requirements and are stored using bcrypt with a per-record salt.",
      },
      {
        heading: "Audit logging",
        body: "Every meaningful action inside a workspace — login, deal creation, deal stage change, document upload, document download, permission change, member invitation, billing event — is logged. Audit logs are immutable, exportable, and retained for 12 months on Team and 24 months on Enterprise.",
      },
      {
        heading: "Vulnerability management",
        body: "ADGA conducts continuous dependency scanning, monthly static analysis, and an annual independent penetration test. Critical vulnerabilities are patched within 24 hours of disclosure. High-severity vulnerabilities within 7 days. Medium and low within the next release cycle. The vulnerability management program is reviewed quarterly.",
      },
      {
        heading: "Incident response",
        body: "ADGA maintains a documented incident response plan covering detection, containment, eradication, recovery, and post-incident review. Confirmed security incidents affecting customer data are communicated to affected workspaces within 72 hours of confirmation, in accordance with the Data Processing Addendum. A post-incident report is provided to affected workspaces within 30 days.",
      },
      {
        heading: "Business continuity",
        body: "Workspace data is backed up continuously to Cloudflare's distributed storage. Point-in-time recovery is available for the most recent 35 days. The platform is designed for multi-region failover. Recovery time objective (RTO) is 4 hours; recovery point objective (RPO) is 1 hour. The business continuity plan is tested at least annually.",
      },
      {
        heading: "Personnel security",
        body: "All ADGA personnel sign confidentiality agreements and complete security awareness training annually. Access to production systems is granted on a least-privilege basis and is logged. Background checks are conducted for all personnel with access to customer data. Access is revoked immediately on termination.",
      },
      {
        heading: "Responsible disclosure",
        body: "Security researchers who identify a vulnerability in ADGA can submit reports through the in-workspace security disclosure form. Confirmed vulnerabilities are acknowledged within 5 business days and resolved according to the severity timelines above. ADGA does not currently operate a paid bug bounty program but credits responsible disclosures publicly with the researcher's permission.",
      },
      {
        heading: "Compliance",
        body: "ADGA is built to align with SOC 2 Type II, ISO 27001, and the security control frameworks expected by Enterprise customers. The most current attestations are available on request through the workspace, subject to a mutual non-disclosure agreement.",
      },
    ],
  },
];

export default function PoliciesPage() {
  const [activeId, setActiveId] = React.useState<string>(POLICIES[0].id);
  const active = POLICIES.find((p) => p.id === activeId) ?? POLICIES[0];

  return (
    <MarketingLayout>
      <style>{`body::before { display: none !important; }`}</style>
      <div style={{ background: "#ffffff", minHeight: "calc(100vh - 80px)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            maxWidth: 1320,
            margin: "0 auto",
            padding: "48px 32px 96px",
            gap: 56,
            alignItems: "start",
          }}
        >
        {/* LEFT SIDEBAR */}
        <aside
          aria-label="Policy navigation"
          style={{
            position: "sticky",
            top: 96,
            alignSelf: "start",
            padding: 24,
            background: "#ffffff",
            border: "1px solid var(--rule, #e8e4de)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--accent, #5d2cd6)",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent, #5d2cd6)" }} />
            Policy Center
          </div>

          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "0 0 24px",
              color: "var(--ink, #0d0c0a)",
            }}
          >
            Every policy, one place.
          </h2>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {POLICIES.map((policy) => {
              const isActive = policy.id === activeId;
              return (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setActiveId(policy.id)}
                  style={{
                    textAlign: "left",
                    padding: "11px 14px",
                    fontSize: 14,
                    lineHeight: 1.3,
                    color: isActive ? "var(--ink, #0d0c0a)" : "var(--ink-2, #3a3833)",
                    background: isActive ? "var(--surface, #ffffff)" : "transparent",
                    border: isActive ? "1px solid var(--rule, #e8e4de)" : "1px solid transparent",
                    borderRadius: 6,
                    fontWeight: isActive ? 500 : 300,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.12s, color 0.12s, border-color 0.12s",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      color: isActive ? "var(--accent, #5d2cd6)" : "var(--ink-3, #6b6760)",
                      minWidth: 18,
                    }}
                  >
                    {String(POLICIES.indexOf(policy) + 1).padStart(2, "0")}
                  </span>
                  <span style={{ flex: 1 }}>{policy.label}</span>
                </button>
              );
            })}
          </nav>

          <p
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid var(--rule, #e8e4de)",
              fontSize: 11.5,
              color: "var(--ink-3, #6b6760)",
              lineHeight: 1.55,
              margin: "28px 0 0",
            }}
          >
            Material updates to any policy are surfaced inside the workspace before they take effect.
          </p>
        </aside>

        {/* RIGHT CONTENT PANEL */}
        <article style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--accent, #5d2cd6)",
              marginBottom: 14,
            }}
          >
            {String(POLICIES.indexOf(active) + 1).padStart(2, "0")} · Policy
          </div>

          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(36px, 4.5vw, 52px)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              margin: "0 0 16px",
              color: "var(--ink, #0d0c0a)",
            }}
          >
            {active.label}.
          </h1>

          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--ink-2, #3a3833)",
              maxWidth: "62ch",
              margin: "0 0 24px",
            }}
          >
            {active.summary}
          </p>

          <div
            style={{
              display: "inline-flex",
              gap: 32,
              padding: "14px 20px",
              background: "#ffffff",
              border: "1px solid var(--rule, #e8e4de)",
              borderRadius: 8,
              marginBottom: 56,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-3, #6b6760)",
            }}
          >
            <span>
              Effective <strong style={{ color: "var(--ink, #0d0c0a)", fontWeight: 500, marginLeft: 6 }}>{active.effective}</strong>
            </span>
            <span>
              Updated <strong style={{ color: "var(--ink, #0d0c0a)", fontWeight: 500, marginLeft: 6 }}>{active.updated}</strong>
            </span>
            <span>
              Sections <strong style={{ color: "var(--ink, #0d0c0a)", fontWeight: 500, marginLeft: 6 }}>{active.sections.length}</strong>
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {active.sections.map((section, idx) => (
              <section
                key={section.heading}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr",
                  gap: 24,
                  paddingBottom: 40,
                  borderBottom: idx === active.sections.length - 1 ? "none" : "1px solid var(--rule, #e8e4de)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    color: "var(--accent, #5d2cd6)",
                    paddingTop: 4,
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 22,
                      fontWeight: 500,
                      lineHeight: 1.2,
                      letterSpacing: "-0.015em",
                      color: "var(--ink, #0d0c0a)",
                      margin: "0 0 14px",
                    }}
                  >
                    {section.heading}
                  </h3>
                  <p
                    style={{
                      fontSize: 15.5,
                      color: "var(--ink-2, #3a3833)",
                      lineHeight: 1.7,
                      margin: 0,
                      maxWidth: "62ch",
                    }}
                  >
                    {section.body}
                  </p>
                </div>
              </section>
            ))}
          </div>

          <div
            style={{
              marginTop: 48,
              padding: "20px 24px",
              background: "#ffffff",
              border: "1px solid var(--rule, #e8e4de)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ink-3, #6b6760)",
              lineHeight: 1.6,
              maxWidth: "62ch",
            }}
          >
            This policy is one of {POLICIES.length} that govern how ADGA collects, secures, and handles data. Related policies are listed in the sidebar. Material updates are surfaced inside the workspace before they take effect.
          </div>
        </article>
        </div>
      </div>
    </MarketingLayout>
  );
}
