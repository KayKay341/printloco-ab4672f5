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

const Index = () => (
  <div className="min-h-screen bg-background">
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
