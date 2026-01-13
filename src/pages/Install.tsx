import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Smartphone,
  Check,
  Share,
  Plus,
  ArrowRight,
  Bell,
  Wifi,
  Zap,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Lightning Fast", description: "App-like speed and performance" },
    { icon: Bell, title: "Push Notifications", description: "Get notified about new tasks nearby" },
    { icon: Wifi, title: "Works Offline", description: "Access core features without internet" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">V</span>
          </div>
          <CardTitle className="text-2xl">Install Vouch App</CardTitle>
          <CardDescription>
            Get the full app experience on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">App Installed!</h3>
                <p className="text-muted-foreground">
                  Vouch is ready to use on your device
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/")}>
                Open App
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <>
              {/* Features */}
              <div className="space-y-3">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Install Instructions */}
              {isIOS ? (
                <div className="space-y-4">
                  <p className="text-sm text-center text-muted-foreground">
                    To install on iOS:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Share className="h-4 w-4" />
                      </div>
                      <span className="text-sm">1. Tap the Share button</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-sm">2. Tap "Add to Home Screen"</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="text-sm">3. Tap "Add" to confirm</span>
                    </div>
                  </div>
                </div>
              ) : deferredPrompt ? (
                <Button className="w-full" size="lg" onClick={handleInstall}>
                  <Download className="h-5 w-5 mr-2" />
                  Install App
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <p>Open this page in Chrome or Edge to install</p>
                </div>
              )}

              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => navigate("/")}
              >
                Continue in Browser
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
