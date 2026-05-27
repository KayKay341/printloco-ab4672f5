import { Navigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import HowItWorks from "@/components/site/HowItWorks";
import CitiesLaunching from "@/components/site/CitiesLaunching";
import Stats from "@/components/site/Stats";
import MakersCTA from "@/components/site/MakersCTA";
import Community from "@/components/site/Community";
import Testimonials from "@/components/site/Testimonials";
import FinalCTA from "@/components/site/FinalCTA";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const stayHome = searchParams.get("home") === "1";

  if (!loading && profile?.role === "maker" && !stayHome) {
    return <Navigate to="/maker" replace />;
  }

  return (
  <div className="min-h-screen bg-background">
    <SEO
      title="PrintLoco — Hyperlocal 3D Printing Near You"
      description="Find trusted 3D printer makers within 10 miles. Upload an STL, get an instant quote, pick up the same day. Local prints, fair prices, real community."
      path="/"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: "PrintLoco — Hyperlocal 3D Printing",
        provider: { "@type": "Organization", name: "PrintLoco", url: "https://printloco.shop" },
        areaServed: "United States",
        serviceType: "On-demand 3D printing",
      }}
    />
    <Navbar />
    <main>
      <Hero />
      <Marquee />
      <HowItWorks />
      <CitiesLaunching />
      <Stats />
      <MakersCTA />
      <Community />
      <Testimonials />
      <FinalCTA />
    </main>
    <Footer />
  </div>
);

export default Index;
