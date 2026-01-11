import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { VoucherVerification } from "@/components/admin/VoucherVerification";
import { AIVideoAnalysis } from "@/components/admin/AIVideoAnalysis";
import { LiveStreamingPanel } from "@/components/admin/LiveStreamingPanel";
import { AdminManagement } from "@/components/admin/AdminManagement";
import {
  Shield,
  Users,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Activity,
  BarChart3,
  Brain,
  Video,
  IdCard,
  Sliders,
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

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [trustScoreValue, setTrustScoreValue] = useState<number>(5);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex flex-col items-center justify-center py-20">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have admin privileges</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      open: { variant: "secondary", className: "bg-green-500/10 text-green-500" },
      assigned: { variant: "secondary", className: "bg-blue-500/10 text-blue-500" },
      pending_review: { variant: "secondary", className: "bg-amber-500/10 text-amber-500" },
      completed: { variant: "secondary", className: "bg-green-600/10 text-green-600" },
      disputed: { variant: "destructive", className: "bg-red-500/10 text-red-500" },
      cancelled: { variant: "outline", className: "text-muted-foreground" },
    };
    const config = variants[status] || { variant: "outline" as const, className: "" };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage platform, users, and disputes</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">{stats.activeTasksCount} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bounty Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalBountyPaid.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{stats.totalTransactions} transactions</p>
            </CardContent>
          </Card>
          <Card className={stats.pendingDisputes > 0 ? "border-destructive/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Disputes</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.pendingDisputes > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDisputes}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 lg:w-auto lg:inline-grid">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-2">
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">Manage</span>
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Disputes</span>
              {stats.pendingDisputes > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.pendingDisputes}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="streaming" className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Streaming</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="gap-2">
              <IdCard className="h-4 w-4" />
              <span className="hidden sm:inline">Verify</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab (Phase 8.5) */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Admin Management Tab */}
          <TabsContent value="management">
            <AdminManagement />
          </TabsContent>

          {/* AI Video Analysis Tab (Phase 8.1) */}
          <TabsContent value="ai-analysis">
            <AIVideoAnalysis />
          </TabsContent>

          {/* Live Streaming Tab (Phase 8.2) */}
          <TabsContent value="streaming">
            <LiveStreamingPanel />
          </TabsContent>

          {/* Voucher Verification Tab (Phase 8.4) */}
          <TabsContent value="verification">
            <VoucherVerification />
          </TabsContent>

          {/* Disputes Tab (Phase 8.3) */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Dispute Resolution</CardTitle>
                <CardDescription>Review and resolve disputed tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {disputes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No pending disputes</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {disputes.map((dispute) => (
                        <Card key={dispute.id} className="border-destructive/30">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold">{dispute.title}</h4>
                                <p className="text-sm text-muted-foreground">{dispute.address}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    {dispute.bounty_amount}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(dispute.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={() => resolveDispute(dispute.id, 'approve')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>View and manage all platform tasks</CardDescription>
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
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {task.title}
                          </TableCell>
                          <TableCell className="capitalize">{task.category}</TableCell>
                          <TableCell>${task.bounty_amount}</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/task/${task.id}`)}
                            >
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
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage users, verification, and trust scores</CardDescription>
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
                      {users.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={userItem.avatar_url || undefined} />
                                <AvatarFallback>
                                  {userItem.full_name?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{userItem.full_name || "Anonymous"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {userItem.role || "none"}
                            </Badge>
                          </TableCell>
                          <TableCell>{userItem.trust_score?.toFixed(1) || "5.0"}</TableCell>
                          <TableCell>${userItem.wallet_balance?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>
                            {userItem.is_verified ? (
                              <Badge className="bg-green-500/10 text-green-500">Verified</Badge>
                            ) : (
                              <Badge variant="outline">Unverified</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={userItem.is_verified ? "outline" : "default"}
                                onClick={() => updateUserVerification(userItem.id, !userItem.is_verified)}
                              >
                                {userItem.is_verified ? "Unverify" : "Verify"}
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
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
                    <Label>Minimum Bounty Amount ($)</Label>
                    <Input
                      type="number"
                      value={settings.minBountyAmount}
                      onChange={(e) => updateSettings({ minBountyAmount: parseFloat(e.target.value) })}
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Bounty Amount ($)</Label>
                    <Input
                      type="number"
                      value={settings.maxBountyAmount}
                      onChange={(e) => updateSettings({ maxBountyAmount: parseFloat(e.target.value) })}
                      min={100}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
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
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
