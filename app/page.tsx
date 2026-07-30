import { DealFlowSection } from "@/components/site/DealFlowSection";
import { EscrowAnatomySection } from "@/components/site/EscrowAnatomySection";
import { FinalCTA } from "@/components/site/FinalCTA";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LandingNav } from "@/components/site/LandingNav";
import { LandingMotion } from "@/components/site/LandingMotion";
import { SecuritySection } from "@/components/site/SecuritySection";
import { TrustSection } from "@/components/site/TrustSection";

export default function Home() {
  return (
    <div className="cleardeal cd-page-shell min-h-[100dvh] overflow-x-clip text-slate-950">
      <LandingMotion />
      <LandingNav />
      <main id="main-content" className="cd-page-enter">
        <Hero />
        <TrustSection />
        <DealFlowSection />
        <EscrowAnatomySection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
