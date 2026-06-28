import { AppNav } from "@/components/AppNav";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Tools } from "@/components/site/Tools";
import { Demo } from "@/components/site/Demo";
import { Footer } from "@/components/site/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ background: "#f9fafb" }}>
      <AppNav />
      <main>
        <Hero />
        <Demo />
        <HowItWorks />
        <Tools />
      </main>
      <Footer />
    </div>
  );
}
