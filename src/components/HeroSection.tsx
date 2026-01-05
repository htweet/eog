import { Shield, Video, MapPin, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-8">
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -left-20 top-40 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />

      <div className="container relative">
        {/* Welcome badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
          <Shield className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-accent">
            Trusted by 10,000+ users worldwide
          </span>
        </div>

        {/* Main heading */}
        <h1 className="mb-4 max-w-3xl text-4xl font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
          Get{" "}
          <span className="relative">
            <span className="relative z-10 text-primary">Eyes on the Ground</span>
            <span className="absolute bottom-2 left-0 -z-10 h-3 w-full bg-primary/20" />
          </span>{" "}
          Before You Buy
        </h1>

        {/* Subtitle */}
        <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Connect with verified local agents who visit, verify, and stream live video of cars, apartments, or items. Never get scammed again.
        </p>

        {/* CTA Buttons */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row">
          <Button size="xl" variant="hero" className="w-full sm:w-auto">
            <Video className="mr-2 h-5 w-5" />
            Post a Vouch
          </Button>
          <Button size="xl" variant="outline" className="w-full sm:w-auto">
            <MapPin className="mr-2 h-5 w-5" />
            Become a Voucher
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap gap-6">
          {[
            "Live Video Verification",
            "GPS-Stamped Evidence",
            "Secure Escrow Payments",
            "AI-Powered Checklists",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
