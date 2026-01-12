import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Eye, 
  Shield, 
  MapPin, 
  Star, 
  ArrowRight, 
  Zap,
  Car,
  Home as HomeIcon,
  Smartphone,
  Package
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  const recentVerifications = [
    {
      id: 1,
      title: "2019 Toyota Camry Inspection",
      category: "auto",
      location: "Lagos, Nigeria",
      rating: 4.9,
      verified: true,
      timeAgo: "2 hours ago"
    },
    {
      id: 2,
      title: "3BR Apartment Viewing",
      category: "realestate",
      location: "Abuja, Nigeria",
      rating: 5.0,
      verified: true,
      timeAgo: "5 hours ago"
    },
    {
      id: 3,
      title: "iPhone 15 Pro Verification",
      category: "electronics",
      location: "Port Harcourt, Nigeria",
      rating: 4.8,
      verified: true,
      timeAgo: "1 day ago"
    },
    {
      id: 4,
      title: "Commercial Space Check",
      category: "realestate",
      location: "Kano, Nigeria",
      rating: 4.7,
      verified: true,
      timeAgo: "2 days ago"
    },
    {
      id: 5,
      title: "MacBook Air Condition Check",
      category: "electronics",
      location: "Ibadan, Nigeria",
      rating: 5.0,
      verified: true,
      timeAgo: "3 days ago"
    },
    {
      id: 6,
      title: "Honda Accord 2020 Review",
      category: "auto",
      location: "Enugu, Nigeria",
      rating: 4.6,
      verified: true,
      timeAgo: "4 days ago"
    }
  ];

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "auto":
        return { bg: "gradient-auto", icon: Car, color: "text-category-auto" };
      case "realestate":
        return { bg: "gradient-realestate", icon: HomeIcon, color: "text-category-realestate" };
      case "electronics":
        return { bg: "gradient-electronics", icon: Smartphone, color: "text-category-electronics" };
      default:
        return { bg: "gradient-general", icon: Package, color: "text-category-general" };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container py-8 space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-0">
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered Verification
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
              Get <span className="text-primary">Truth</span> on the Ground
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Connect with verified local scouts to inspect vehicles, properties, and electronics 
              before you buy. Real-time video, AI analysis, and instant reports.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="gradient-primary text-primary-foreground shadow-button rounded-xl"
                onClick={() => navigate("/create-task")}
              >
                <Eye className="w-5 h-5 mr-2" />
                Post a Vouch Request
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate("/browse")}
              >
                <MapPin className="w-5 h-5 mr-2" />
                Browse Tasks
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Verified Scouts", value: "2,500+", icon: Shield },
            { label: "Tasks Completed", value: "15,000+", icon: Eye },
            { label: "Cities Covered", value: "50+", icon: MapPin },
            { label: "Average Rating", value: "4.9★", icon: Star }
          ].map((stat, i) => (
            <Card key={i} className="rounded-2xl shadow-card border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Recent Verifications - Masonry Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recent Verifications</h2>
              <p className="text-muted-foreground">Real-time feed of completed vouches</p>
            </div>
            <Button variant="ghost" className="text-primary" onClick={() => navigate("/browse")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {recentVerifications.map((item, index) => {
              const style = getCategoryStyle(item.category);
              const Icon = style.icon;
              const isLarge = index % 3 === 0;
              
              return (
                <Card 
                  key={item.id} 
                  className={`break-inside-avoid rounded-3xl shadow-card border-0 overflow-hidden transition-all hover:shadow-card-hover hover:-translate-y-1 cursor-pointer ${isLarge ? 'pb-4' : ''}`}
                >
                  <div className={`${style.bg} p-4 ${isLarge ? 'h-32' : 'h-20'} flex items-end`}>
                    <Icon className="w-8 h-8 text-white/90" />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.verified && <Shield className="w-3 h-3 mr-1 text-accent" />}
                        Verified
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{item.rating}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">How Vouch Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Post Your Request",
                description: "Describe what you need verified - a car, property, or electronics",
                icon: "📝"
              },
              {
                step: "2",
                title: "Scout Accepts",
                description: "A verified local scout claims your task and heads to the location",
                icon: "🏃"
              },
              {
                step: "3",
                title: "Get Your Report",
                description: "Watch live or receive an AI-analyzed video report with findings",
                icon: "📊"
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl gradient-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-button">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
