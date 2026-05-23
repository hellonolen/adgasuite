import { AffiliateLayout } from "@/components/suite/AffiliateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { loadAffiliateContext } from "@/lib/server/affiliate";
import { LinksBuilder } from "./links-builder";

export default async function AffiliateLinksPage() {
  const { email, affiliate } = await loadAffiliateContext("/suite/affiliate/links");

  if (!affiliate) {
    return (
      <AffiliateLayout email={email}>
        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#0d0c0a]">No referral link yet</CardTitle>
            <p className="text-sm text-[#6b6760]">
              Enroll on the overview page to generate your referral link and UTM builder.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-[#5d2cd6] text-white hover:bg-[#4a23ab]">
              <Link href="/suite/affiliate">Get started</Link>
            </Button>
          </CardContent>
        </Card>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout email={email} referralCode={affiliate.referral_code}>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-xl font-semibold text-[#0d0c0a]">Referral links</h1>
          <p className="mt-1 text-sm text-[#6b6760]">
            Share the base link or build a tracked variant with UTM parameters.
          </p>
        </header>

        <LinksBuilder baseUrl={affiliate.referral_url} referralCode={affiliate.referral_code} />
      </div>
    </AffiliateLayout>
  );
}
