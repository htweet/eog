import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoriesSection } from "@/components/CategoriesSection";
import { ActiveBountiesSection } from "@/components/ActiveBountiesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { BottomNav } from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header userName="Alex" />
      <main>
        <HeroSection />
        <CategoriesSection />
        <ActiveBountiesSection />
        <HowItWorksSection />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
