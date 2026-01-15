import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/HeroSection";
import { CategoriesSection } from "@/components/CategoriesSection";
import { ActiveBountiesSection } from "@/components/ActiveBountiesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { RecentVerifications } from "@/components/home/RecentVerifications";
import { Shield, CheckCircle, Video, Wallet, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Public Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Vouch</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#categories" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Categories
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <HeroSection />
        
        {/* Trust Indicators */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Live Video Verification</h3>
                <p className="text-sm text-muted-foreground">Real-time streaming proof</p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Verified Vouchers</h3>
                <p className="text-sm text-muted-foreground">Trusted local agents</p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Secure Escrow</h3>
                <p className="text-sm text-muted-foreground">Protected payments</p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Easy Withdrawals</h3>
                <p className="text-sm text-muted-foreground">Fast Nigerian bank payouts</p>
              </div>
            </div>
          </div>
        </section>

        <RecentVerifications />
        
        <div id="categories">
          <CategoriesSection />
        </div>
        
        <ActiveBountiesSection />
        
        <div id="how-it-works">
          <HowItWorksSection />
        </div>

        {/* CTA Section */}
        <section id="pricing" className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join thousands of users who trust Vouch for on-the-ground verification
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/auth")}
              >
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Vouch</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vouch. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
