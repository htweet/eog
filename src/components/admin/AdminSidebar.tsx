import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  Users,
  ClipboardList,
  AlertTriangle,
  Settings,
  Shield,
  Lock,
  Banknote,
  Crown,
  Building2,
  Brain,
  Video,
  IdCard,
  Sliders,
  LogOut,
  ChevronDown,
  Briefcase,
  UserCheck,
  ArrowLeftRight,
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingDisputes: number;
}

const navSections = [
  {
    label: "Overview",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "management", label: "Management", icon: Sliders },
    ],
  },
  {
    label: "Financial",
    items: [
      { id: "escrow", label: "Escrow", icon: Lock },
      { id: "payouts", label: "Payouts", icon: Banknote },
    ],
  },
  {
    label: "Users & Teams",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "pro-validation", label: "Pro Validation", icon: Crown },
      { id: "agencies", label: "Agencies", icon: Building2 },
    ],
  },
  {
    label: "Moderation",
    items: [
      { id: "disputes", label: "Disputes", icon: AlertTriangle },
      { id: "verification", label: "Verification", icon: IdCard },
      { id: "ai-analysis", label: "AI Analysis", icon: Brain },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "tasks", label: "Tasks", icon: ClipboardList },
      { id: "streaming", label: "Streaming", icon: Video },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, pendingDisputes }: AdminSidebarProps) {
  const { user, userRole, allRoles, switchRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSwitchToUser = async (role: "requester" | "voucher") => {
    const result = await switchRole(role);
    if (result.error) {
      toast.error("Failed to switch role", { description: result.error.message });
      return;
    }
    toast.success(`Switched to ${role}`, { description: "Redirecting..." });
    setTimeout(() => {
      navigate(role === "voucher" ? "/dashboard/voucher" : "/dashboard/requester");
    }, 400);
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-button">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm truncate">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Platform Control</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Role Switcher */}
      <div className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Switch View
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs">Switch to User View</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allRoles.includes("requester") && (
              <DropdownMenuItem onClick={() => handleSwitchToUser("requester")} className="gap-2">
                <Briefcase className="h-4 w-4 text-blue-500" />
                Requester Dashboard
              </DropdownMenuItem>
            )}
            {allRoles.includes("voucher") && (
              <DropdownMenuItem onClick={() => handleSwitchToUser("voucher")} className="gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Voucher Dashboard
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SidebarSeparator />

      <SidebarContent className="px-1">
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-3">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={activeTab === item.id}
                      className="gap-3 rounded-lg transition-all"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                      {item.id === "disputes" && pendingDisputes > 0 && (
                        <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 px-1.5">
                          {pendingDisputes}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs gradient-primary text-primary-foreground">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.email}</p>
            <Badge variant="outline" className="text-[10px] h-4 mt-0.5">Admin</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
