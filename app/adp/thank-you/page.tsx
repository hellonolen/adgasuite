import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { AdpThankYouTracker } from "./AdpThankYouTracker";

const adpAffiliateCode = "PW56143";
const adpReferralLink = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";

export default async function AdpThankYouPage({
  searchParams,
}: {
  searchParams?: Promise<{ lead?: string; partner?: string }>;
}) {
  const params = await searchParams;
  const leadId = params?.lead;

  return (
    <MarketingLayout>
      <div className="wrap adp-page" data-adp-affiliate-code={adpAffiliateCode} data-adp-affiliate-url={adpReferralLink}>
        <AdpThankYouTracker affiliateCode={adpAffiliateCode} affiliateUrl={adpReferralLink} leadId={leadId} />
        <section className="adp-thank-you-panel">
          <div>
            <div className="adp-badge-row">
              <span>Request received</span>
              <span>ADP partner code {adpAffiliateCode}</span>
            </div>
            <h1>Thank you. We received your payroll request.</h1>
            <p>
              Your information has been received and routed for ADP payroll follow-up. A payroll specialist will contact you shortly about payroll or HR service options for your company.
            </p>
          </div>
          <div className="adp-thank-you-card">
            <span>What happens next</span>
            <ul>
              <li>ADGA keeps the request tied to partner code {adpAffiliateCode}.</li>
              <li>Your company details are reviewed for payroll and HR fit.</li>
              <li>ADP follow-up will focus on eligibility, timing, and the services you asked about.</li>
            </ul>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
