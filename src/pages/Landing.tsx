import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield, Video, CheckCircle, ArrowRight,
  Zap, Star, Flame, ChevronDown,
  Car, Home, Smartphone, Package, Lock, MapPin
} from "lucide-react";

function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 60;
    let current = 0;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(interval); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(interval);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

const CATEGORIES = [
  { label: "Automobiles", color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", count: "2.4K+ vouches", emoji: "🚗" },
  { label: "Real Estate", color: "from-green-500 to-emerald-600", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", count: "1.8K+ vouches", emoji: "🏠" },
  { label: "Electronics", color: "from-violet-500 to-purple-600", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", count: "3.1K+ vouches", emoji: "📱" },
  { label: "General Items", color: "from-amber-500 to-orange-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", count: "5.2K+ vouches", emoji: "📦" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Post a Bounty", desc: "Describe the item, set the bounty amount, and pin the location. AI suggests a fair price instantly.", icon: "📍", color: "bg-blue-500" },
  { step: "02", title: "Voucher Accepts", desc: "A verified local agent near the location accepts and travels to the spot in real time.", icon: "🏃", color: "bg-violet-500" },
  { step: "03", title: "Live Video Proof", desc: "Voucher records live video with GPS watermark & timestamp overlay. No gallery uploads ever.", icon: "📹", color: "bg-green-500" },
  { step: "04", title: "Approve & Pay", desc: "Review the video and AI checklist. Approve to release escrow or open a dispute if needed.", icon: "✅", color: "bg-amber-500" },
];

const TESTIMONIALS = [
  { name: "Amaka O.", role: "Car Buyer", city: "Lagos", text: "I almost bought a flooded car. Vouch saved me ₦3.2M. The voucher spotted the rust under the carpet instantly.", stars: 5, avatar: "A" },
  { name: "Emeka V.", role: "Gold Voucher", city: "Abuja", text: "I've made ₦180K in 3 months doing weekend verifications. The flash bounties are crazy profitable.", stars: 5, avatar: "E" },
  { name: "Bola R.", role: "Requester", city: "Port Harcourt", text: "The AI checklist is a game changer. It knew exactly what to inspect on the property I was buying.", stars: 5, avatar: "B" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">Vouch</span>
            <Badge className="hidden sm:inline-flex text-[10px] h-4 px-1.5 bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border-0">BETA</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-5">
            {[["How It Works", "#how-it-works"], ["Categories", "#categories"], ["Pricing", "#pricing"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 border-0">
              Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative min-h-[92svh] flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-violet-950/40 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(139,92,246,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(59,130,246,0.1),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className={`container relative z-10 py-16 transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 mb-6">
                <Flame className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
                <span className="text-sm font-medium text-violet-300">Nigeria's #1 Physical Verification Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                Stop Getting Scammed.{" "}
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Vouch It First.
                </span>
              </h1>

              <p className="text-lg text-slate-300 max-w-xl mx-auto mb-8">
                Hire a trusted local agent to physically visit any location, record live video proof,
                and verify what you're buying — before you send a kobo.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
                <Button size="lg" onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 border-0 text-white shadow-lg shadow-violet-500/25 h-12 px-8 text-base">
                  Post a Bounty <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto border-slate-600 text-slate-200 hover:bg-slate-800 h-12 px-8 text-base">
                  <Zap className="mr-2 h-4 w-4 text-yellow-400" /> Become a Voucher
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {[
                  { label: "Vouches Completed", value: 12847, suffix: "+" },
                  { label: "Scams Prevented", value: 3241, suffix: "+" },
                  { label: "Active Vouchers", value: 892, suffix: "" },
                  { label: "Avg Payout", value: 3200, suffix: "", prefix: "₦" },
                ].map(({ label, value, suffix, prefix }) => (
                  <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur p-3">
                    <p className="text-xl font-bold text-white"><AnimatedCounter target={value} suffix={suffix} prefix={prefix} /></p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
              <ChevronDown className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="py-6 border-y bg-muted/30">
          <div className="container">
            <div className="flex flex-wrap items-center justify-center gap-5 md:gap-10">
              {[
                { icon: Video, label: "Live Camera Only — No Gallery", color: "text-blue-500" },
                { icon: MapPin, label: "GPS Watermark on Every Video", color: "text-green-500" },
                { icon: Lock, label: "Escrow Protected Payments", color: "text-violet-500" },
                { icon: Shield, label: "AI Fraud Detection", color: "text-amber-500" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color} shrink-0`} />
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section id="categories" className="py-14">
          <div className="container">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-0">Browse by Category</Badge>
              <h2 className="text-3xl font-bold">What Can You Vouch?</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">From cars to condos — if it can be visited, it can be vouched.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map(({ label, color, bg, border, count, emoji }) => (
                <Card key={label} className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border ${border} ${bg}`} onClick={() => navigate("/auth")}>
                  <CardContent className="p-5 text-center">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-3 shadow-lg text-2xl`}>{emoji}</div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-14 bg-muted/30">
          <div className="container">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-0">The Process</Badge>
              <h2 className="text-3xl font-bold">How Vouch Works</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {HOW_IT_WORKS.map(({ step, title, desc, icon, color }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className={`h-16 w-16 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-lg text-3xl`}>{icon}</div>
                  <span className="text-xs font-bold text-muted-foreground mb-1">STEP {step}</span>
                  <h3 className="font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VOUCHER EARNING */}
        <section className="py-14">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-blue-700 p-8 md:p-12 text-white">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <Badge className="mb-4 bg-white/20 text-white border-0">For Vouchers</Badge>
                    <h2 className="text-3xl font-bold mb-3">Turn Your Neighborhood Into Income</h2>
                    <p className="text-violet-100 mb-6">Earn ₦1,000–₦10,000 per verification. Work your own hours. Get paid instantly to your bank.</p>
                    <div className="space-y-2 mb-6">
                      {["Earn Vouch Credits™ on every task", "⚡ Flash Bounties pay 2× in 2 hours", "Build your VouchScore™ for better rates", "Join a Guild and earn extra bonuses"].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-300 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => navigate("/auth")} size="lg" className="bg-white text-violet-700 hover:bg-violet-50 font-bold">
                      <Zap className="mr-2 h-4 w-4" /> Start Earning Today
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { emoji: "🥉", level: "Bronze", range: "₦1,000–₦2,500", score: "0–39" },
                      { emoji: "🥈", level: "Silver", range: "₦2,000–₦4,000", score: "40–59" },
                      { emoji: "🥇", level: "Gold", range: "₦3,500–₦6,000", score: "60–79" },
                      { emoji: "⚡", level: "Elite", range: "₦8K–₦15K", score: "95–100" },
                    ].map(({ emoji, level, range, score }) => (
                      <div key={level} className="rounded-xl bg-white/10 p-3 text-center">
                        <div className="text-2xl mb-1">{emoji}</div>
                        <p className="text-sm font-bold">{level}</p>
                        <p className="text-xs text-violet-200">{range}</p>
                        <p className="text-xs text-violet-300 mt-0.5">Score {score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-14 bg-muted/30">
          <div className="container">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-0">Real Stories</Badge>
              <h2 className="text-3xl font-bold">What Our Users Say</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {TESTIMONIALS.map(({ name, role, city, text, stars, avatar }) => (
                <Card key={name} className="border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-0.5 mb-3">{Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">{avatar}</div>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">{role} · {city}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-14">
          <div className="container">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border-0">Pricing</Badge>
              <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground mt-2">Vouchers keep 85% of every bounty. Requesters only pay when verified.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { name: "Free Voucher", price: "₦0", desc: "Start earning today", features: ["Keep 85% of bounties", "Standard matching", "5 VC per task", "Basic VouchScore profile"], cta: "Start Free", highlight: false },
                { name: "Pro Voucher", price: "₦2,499/mo", desc: "For serious earners", features: ["Priority task matching", "Pro badge on profile", "Pro-only bounties", "Enhanced AI analysis", "50 VC monthly bonus"], cta: "Go Pro", highlight: true },
                { name: "Agency", price: "₦9,999/mo", desc: "For voucher teams", features: ["Up to 10 team members", "Bulk task management", "Agency dashboard", "API access", "200 VC monthly bonus"], cta: "Start Agency", highlight: false },
              ].map(({ name, price, desc, features, cta, highlight }) => (
                <Card key={name} className={highlight ? "border-violet-500 shadow-lg shadow-violet-500/10 relative" : ""}>
                  {highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-violet-600 text-white border-0 shadow">Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <p className="font-bold text-lg">{name}</p>
                    <p className="text-3xl font-extrabold mt-1 mb-0.5">{price}</p>
                    <p className="text-sm text-muted-foreground mb-5">{desc}</p>
                    <div className="space-y-2 mb-6">
                      {features.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${highlight ? "text-violet-500" : "text-green-500"}`} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button className={`w-full ${highlight ? "bg-violet-600 hover:bg-violet-700" : ""}`} variant={highlight ? "default" : "outline"} onClick={() => navigate("/auth")}>
                      {cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 bg-gradient-to-br from-slate-950 to-violet-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(139,92,246,0.2),transparent_70%)]" />
          <div className="container text-center relative z-10">
            <h2 className="text-4xl font-extrabold mb-4">Ready to Vouch Smarter?</h2>
            <p className="text-lg text-slate-300 max-w-xl mx-auto mb-8">Join 12,000+ Nigerians who verify before they buy — and the vouchers making a living proving it.</p>
            <Button size="lg" onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 border-0 h-12 px-10 text-base shadow-lg shadow-violet-500/30">
              Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 border-t bg-muted/20">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold">Vouch</span>
              <span className="text-muted-foreground text-sm">· Verify Before You Buy</span>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Vouch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
