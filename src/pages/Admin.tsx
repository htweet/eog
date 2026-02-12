import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverviewCards } from "@/components/admin/AdminOverviewCards";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { VoucherVerification } from "@/components/admin/VoucherVerification";
import { AIVideoAnalysis } from "@/components/admin/AIVideoAnalysis";
import { LiveStreamingPanel } from "@/components/admin/LiveStreamingPanel";
import { AdminManagement } from "@/components/admin/AdminManagement";
import { PayoutManagement } from "@/components/admin/PayoutManagement";
import { ProValidation } from "@/components/admin/ProValidation";
import { EscrowManagement } from "@/components/admin/EscrowManagement";
import { AgencyExplorer } from "@/components/admin/AgencyExplorer";
import {
  Shield,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isAdmin,
    loading,
    stats,
    tasks,
    users,
    disputes,
    settings,
    updateUserVerification,
    updateUserTrustScore,
    resolveDispute,
    updateSettings,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState("analytics");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [trustScoreValue, setTrustScoreValue] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have admin privileges</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-green-500/10 text-green-600 border-green-500/20",
      assigned: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      pending_review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      completed: "bg-accent/10 text-accent border-accent/20",
      disputed: "bg-destructive/10 text-destructive border-destructive/20",
      cancelled: "bg-muted text-muted-foreground",
    };
    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const filteredTasks = searchQuery
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const tabTitles: Record<string, { title: string; description: string }> = {
    analytics: { title: "Analytics", description: "Platform performance & insights" },
    management: { title: "Management", description: "Admin operations & controls" },
    escrow: { title: "Escrow", description: "Manage escrow transactions" },
    payouts: { title: "Payouts", description: "Process withdrawal requests" },
    users: { title: "Users", description: "User management & verification" },
    "pro-validation": { title: "Pro Validation", description: "Review upgrade requests" },
    agencies: { title: "Agencies", description: "Explore registered agencies" },
    disputes: { title: "Disputes", description: "Resolve platform disputes" },
    verification: { title: "Verification", description: "Voucher identity checks" },
    "ai-analysis": { title: "AI Analysis", description: "Video analysis results" },
    tasks: { title: "Tasks", description: "All platform tasks" },
    streaming: { title: "Streaming", description: "Live stream management" },
    settings: { title: "Settings", description: "Platform configuration" },
  };

  const currentTab = tabTitles[activeTab] || { title: "Dashboard", description: "" };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingDisputes={stats.pendingDisputes}
        />

        <main className="flex-1 min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div>
                  <h1 className="text-lg font-bold">{currentTab.title}</h1>
                  <p className="text-xs text-muted-foreground">{currentTab.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(activeTab === "users" || activeTab === "tasks") && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${activeTab}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64 h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Overview Cards - always visible */}
            <AdminOverviewCards stats={stats} />

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === "analytics" && <AnalyticsDashboard />}
              {activeTab === "management" && <AdminManagement />}
              {activeTab === "escrow" && <EscrowManagement />}
              {activeTab === "payouts" && <PayoutManagement />}
              {activeTab === "pro-validation" && <ProValidation />}
              {activeTab === "agencies" && <AgencyExplorer />}
              {activeTab === "ai-analysis" && <AIVideoAnalysis />}
              {activeTab === "streaming" && <LiveStreamingPanel />}
              {activeTab === "verification" && <VoucherVerification />}

              {activeTab === "disputes" && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>Dispute Resolution</CardTitle>
                    <CardDescription>Review and resolve disputed tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {disputes.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="font-medium">No pending disputes</p>
                        <p className="text-sm mt-1">All disputes have been resolved</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {disputes.map((dispute) => (
                            <Card key={dispute.id} className="border-destructive/20 hover:shadow-card transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate">{dispute.title}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{dispute.address}</p>
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                      <span className="font-medium text-primary">₦{dispute.bounty_amount.toLocaleString()}</span>
                                      <span className="text-muted-foreground">
                                        {new Date(dispute.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => resolveDispute(dispute.id, 'approve')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => resolveDispute(dispute.id, 'reject')}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "tasks" && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>All Tasks</CardTitle>
                    <CardDescription>{filteredTasks.length} tasks found</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Bounty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTasks.map((task) => (
                            <TableRow key={task.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {task.title}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize text-xs">{task.category}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">₦{task.bounty_amount.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(task.status)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(task.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/task/${task.id}`)}>
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {activeTab === "users" && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>{filteredUsers.length} users found</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Trust Score</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((userItem) => (
                            <TableRow key={userItem.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={userItem.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {userItem.full_name?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{userItem.full_name || "Anonymous"}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {userItem.role || "none"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className={`font-medium ${
                                  (userItem.trust_score || 5) >= 7 ? "text-green-600" :
                                  (userItem.trust_score || 5) >= 4 ? "text-amber-600" : "text-destructive"
                                }`}>
                                  {userItem.trust_score?.toFixed(1) || "5.0"}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">₦{(userItem.wallet_balance || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                {userItem.is_verified ? (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">Unverified</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={userItem.is_verified ? "outline" : "default"}
                                    className="text-xs h-8"
                                    onClick={() => updateUserVerification(userItem.id, !userItem.is_verified)}
                                  >
                                    {userItem.is_verified ? "Unverify" : "Verify"}
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-8"
                                        onClick={() => {
                                          setSelectedUser(userItem.id);
                                          setTrustScoreValue(userItem.trust_score || 5);
                                        }}
                                      >
                                        Edit Score
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Update Trust Score</DialogTitle>
                                        <DialogDescription>
                                          Adjust the trust score for {userItem.full_name || "this user"}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <Label>Trust Score: {trustScoreValue.toFixed(1)}</Label>
                                        <Slider
                                          value={[trustScoreValue]}
                                          onValueChange={([value]) => setTrustScoreValue(value)}
                                          min={0}
                                          max={10}
                                          step={0.1}
                                          className="mt-2"
                                        />
                                      </div>
                                      <DialogFooter>
                                        <Button onClick={() => updateUserTrustScore(userItem.id, trustScoreValue)}>
                                          Save Changes
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {activeTab === "settings" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle>Platform Settings</CardTitle>
                      <CardDescription>Configure global platform settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>Platform Fee (%)</Label>
                        <Input
                          type="number"
                          value={settings.platformFeePercent}
                          onChange={(e) => updateSettings({ platformFeePercent: parseFloat(e.target.value) })}
                          min={0}
                          max={50}
                        />
                        <p className="text-xs text-muted-foreground">Fee deducted from each transaction</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Bounty (₦)</Label>
                        <Input
                          type="number"
                          value={settings.minBountyAmount}
                          onChange={(e) => updateSettings({ minBountyAmount: parseFloat(e.target.value) })}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Bounty (₦)</Label>
                        <Input
                          type="number"
                          value={settings.maxBountyAmount}
                          onChange={(e) => updateSettings({ maxBountyAmount: parseFloat(e.target.value) })}
                          min={100}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle>Feature Toggles</CardTitle>
                      <CardDescription>Enable or disable platform features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Escrow System</Label>
                          <p className="text-xs text-muted-foreground">Hold bounty until task completion</p>
                        </div>
                        <Switch
                          checked={settings.escrowEnabled}
                          onCheckedChange={(checked) => updateSettings({ escrowEnabled: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>GPS Verification Required</Label>
                          <p className="text-xs text-muted-foreground">Require location match for verification</p>
                        </div>
                        <Switch
                          checked={settings.requireGpsVerification}
                          onCheckedChange={(checked) => updateSettings({ requireGpsVerification: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-approve Verified Users</Label>
                          <p className="text-xs text-muted-foreground">Skip review for verified vouchers</p>
                        </div>
                        <Switch
                          checked={settings.autoApproveVerified}
                          onCheckedChange={(checked) => updateSettings({ autoApproveVerified: checked })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
