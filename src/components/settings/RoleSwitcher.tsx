import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Users, Briefcase, Loader2, CheckCircle, ArrowRight } from "lucide-react";

type AppRole = "requester" | "voucher";

export function RoleSwitcher() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<AppRole | null>(null);
  const [hasMultipleRoles, setHasMultipleRoles] = useState(false);
  const [allRoles, setAllRoles] = useState<string[]>([]);

  // Check if user already has multiple roles
  const checkExistingRoles = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    if (data) {
      const roles = data.map(r => r.role);
      setAllRoles(roles);
      setHasMultipleRoles(roles.length > 1);
    }
  };

  const initiateRoleSwitch = async (newRole: AppRole) => {
    await checkExistingRoles();
    setTargetRole(newRole);
    setDialogOpen(true);
  };

  const handleRoleSwitch = async () => {
    if (!user || !targetRole) return;
    
    setLoading(true);

    try {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", targetRole)
        .single();

      if (!existingRole) {
        // Add the new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: targetRole });

        if (error) throw error;
      }

      toast.success(`Switched to ${targetRole} role!`, {
        description: "Redirecting to your new dashboard...",
      });

      setDialogOpen(false);

      // Navigate to appropriate dashboard
      setTimeout(() => {
        if (targetRole === "voucher") {
          navigate("/dashboard/voucher");
        } else {
          navigate("/dashboard/requester");
        }
        // Force page reload to refresh auth context
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Role switch error:", error);
      toast.error("Failed to switch role", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = {
    requester: {
      icon: <Briefcase className="h-6 w-6" />,
      title: "Requester",
      description: "Post verification tasks and pay vouchers",
      benefits: [
        "Create verification requests",
        "Watch live streams from vouchers",
        "Review and approve submissions",
        "Escrow-protected payments",
      ],
    },
    voucher: {
      icon: <Users className="h-6 w-6" />,
      title: "Voucher",
      description: "Complete tasks and earn bounties",
      benefits: [
        "Browse available tasks in your area",
        "Stream live verifications",
        "Earn bounties for completed work",
        "Build your trust score",
      ],
    },
  };

  const currentRoleInfo = userRole && userRole !== "admin" ? roleInfo[userRole as AppRole] : null;
  const otherRole: AppRole = userRole === "requester" ? "voucher" : "requester";
  const otherRoleInfo = roleInfo[otherRole];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Role Management
        </CardTitle>
        <CardDescription>
          Switch between requester and voucher roles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Role */}
        {currentRoleInfo && (
          <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {currentRoleInfo.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{currentRoleInfo.title}</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    Current
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentRoleInfo.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Switch Option */}
        <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {otherRoleInfo.icon}
              </div>
              <div>
                <h3 className="font-semibold">{otherRoleInfo.title}</h3>
                <p className="text-sm text-muted-foreground">{otherRoleInfo.description}</p>
              </div>
            </div>
            <Button 
              onClick={() => initiateRoleSwitch(otherRole)}
              disabled={loading}
            >
              Switch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 pl-13 space-y-2">
            {otherRoleInfo.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          You can have both roles simultaneously. Switching roles will take you to the respective dashboard.
        </p>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {targetRole} Role</DialogTitle>
            <DialogDescription>
              {allRoles.includes(targetRole || "") 
                ? `You already have the ${targetRole} role. We'll switch your active view to that dashboard.`
                : `This will add the ${targetRole} role to your account. You'll be able to switch between roles anytime.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">As a {targetRole}, you can:</h4>
              <ul className="space-y-2">
                {targetRole && roleInfo[targetRole].benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleSwitch} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
