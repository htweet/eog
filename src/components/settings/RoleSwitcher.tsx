import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
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
import { 
  Users, 
  Briefcase, 
  Loader2, 
  CheckCircle, 
  Plus,
  Shield,
  ArrowRight
} from "lucide-react";

type AppRole = "requester" | "voucher" | "admin";

const roleInfo = {
  requester: {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Requester",
    description: "Post verification tasks and pay vouchers",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    benefits: [
      "Create verification requests",
      "Watch live streams from vouchers",
      "Review and approve submissions",
      "Escrow-protected payments",
    ],
  },
  voucher: {
    icon: <Users className="h-5 w-5" />,
    title: "Voucher",
    description: "Complete tasks and earn bounties",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    benefits: [
      "Browse available tasks in your area",
      "Stream live verifications",
      "Earn bounties for completed work",
      "Build your trust score",
    ],
  },
  admin: {
    icon: <Shield className="h-5 w-5" />,
    title: "Admin",
    description: "Manage platform and resolve disputes",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    benefits: [
      "Access admin dashboard",
      "Resolve disputes",
      "Manage users and payouts",
      "View platform analytics",
    ],
  },
};

export function RoleSwitcher() {
  const { userRole, allRoles, isAdmin, switchRole, addRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<AppRole | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleRoleAction = async (role: AppRole, isNew: boolean) => {
    setTargetRole(role);
    setIsAddingNew(isNew);
    setDialogOpen(true);
  };

  const confirmRoleAction = async () => {
    if (!targetRole) return;
    
    setLoading(true);

    try {
      let result;
      if (isAddingNew) {
        result = await addRole(targetRole);
      } else {
        result = await switchRole(targetRole);
      }

      if (result.error) {
        throw result.error;
      }

      toast.success(
        isAddingNew 
          ? `Added ${targetRole} role!` 
          : `Switched to ${targetRole}!`,
        { description: "Redirecting to your dashboard..." }
      );

      setDialogOpen(false);

      // Navigate to appropriate dashboard
      setTimeout(() => {
        if (targetRole === "admin") {
          navigate("/admin");
        } else if (targetRole === "voucher") {
          navigate("/dashboard/voucher");
        } else {
          navigate("/dashboard/requester");
        }
      }, 500);
    } catch (error: any) {
      console.error("Role action error:", error);
      toast.error("Failed to update role", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const availableRoles: AppRole[] = ["requester", "voucher"];
  const rolesToShow = isAdmin ? [...availableRoles, "admin" as AppRole] : availableRoles;

  return (
    <div className="space-y-4">
      {/* Current Active Role */}
      {userRole && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Active Role</p>
          <div className={`p-4 rounded-lg border-2 ${roleInfo[userRole]?.color || ''} bg-card`}>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${roleInfo[userRole]?.color || ''}`}>
                {roleInfo[userRole]?.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{roleInfo[userRole]?.title}</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{roleInfo[userRole]?.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Available Roles */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          {allRoles.length > 1 ? "Switch Role" : "Add Another Role"}
        </p>
        <div className="space-y-3">
          {rolesToShow.map((role) => {
            const info = roleInfo[role];
            const hasRole = allRoles.includes(role);
            const isActive = userRole === role;

            if (isActive) return null; // Don't show active role again

            return (
              <div
                key={role}
                className={`p-4 rounded-lg border transition-all ${
                  hasRole 
                    ? 'hover:border-primary/50 cursor-pointer' 
                    : 'border-dashed hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      hasRole ? info.color : 'bg-muted text-muted-foreground'
                    }`}>
                      {info.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{info.title}</h3>
                        {hasRole && (
                          <Badge variant="outline" className="text-xs">
                            Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRoleAction(role, !hasRole)}
                    variant={hasRole ? "default" : "outline"}
                    size="sm"
                    disabled={loading || (role === "admin" && !isAdmin)}
                  >
                    {hasRole ? (
                      <>
                        Switch <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" /> Add Role
                      </>
                    )}
                  </Button>
                </div>

                {/* Benefits preview for new roles */}
                {!hasRole && role !== "admin" && (
                  <div className="mt-3 pl-13 grid grid-cols-2 gap-2">
                    {info.benefits.slice(0, 2).map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="truncate">{benefit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground pt-2">
        You can have multiple roles. Your active role determines which dashboard you see by default.
        Role preferences are saved to your account.
      </p>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAddingNew ? `Add ${targetRole} Role` : `Switch to ${targetRole}`}
            </DialogTitle>
            <DialogDescription>
              {isAddingNew
                ? `This will add the ${targetRole} role to your account. You can switch between roles anytime.`
                : `Switch your active view to the ${targetRole} dashboard.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {targetRole && (
              <div className={`p-4 rounded-lg ${roleInfo[targetRole].color}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${roleInfo[targetRole].color}`}>
                    {roleInfo[targetRole].icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{roleInfo[targetRole].title}</h4>
                    <p className="text-sm opacity-80">{roleInfo[targetRole].description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {roleInfo[targetRole].benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={confirmRoleAction} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAddingNew ? "Add Role" : "Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
