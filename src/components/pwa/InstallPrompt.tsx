import { useState, useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, Bell, Smartphone } from "lucide-react";

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, promptInstall, requestNotificationPermission } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const dismissedBefore = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedBefore) {
      setDismissed(true);
    }

    // Show prompt after a delay if installable
    if (isInstallable && !dismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, dismissed, isInstalled]);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setShowPrompt(false);
      // Also request notification permission
      await requestNotificationPermission();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  const handleNotificationRequest = async () => {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      // Show success feedback
    }
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-slide-in-up">
      <Card className="rounded-3xl shadow-lg border-0 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-primary-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Install Vouch</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Add to home screen for the best experience
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="gradient-primary text-primary-foreground rounded-xl flex-1"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNotificationRequest}
                  className="rounded-xl"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
