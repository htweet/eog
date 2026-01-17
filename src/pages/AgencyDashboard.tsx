import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProVoucher } from "@/hooks/useProVoucher";
import { useTasks } from "@/hooks/useTasks";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ProBadge } from "@/components/pro/ProBadge";
import { ProUpgradeCard } from "@/components/pro/ProUpgradeCard";
import { TeamManagement } from "@/components/pro/TeamManagement";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TaskMapView } from "@/components/task/TaskMapView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2, 
  Users, 
  MapPin, 
  Wallet, 
  ClipboardList,
  ArrowLeft,
  Loader2,
  UserCheck,
  Clock,
  CheckCircle,
  Crown,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { proProfile, isPro, teamMembers, loading: proLoading } = useProVoucher();
  const { tasks, loading: tasksLoading } = useTasks();
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Filter tasks assigned to this agency
  const agencyTasks = tasks.filter(t => t.voucher_id === user?.id);
  const assignedTasks = agencyTasks.filter(t => t.status === "assigned");
  const completedTasks = agencyTasks.filter(t => t.status === "completed");
  const pendingReview = agencyTasks.filter(t => t.status === "pending_review");

  const handleAssignStaff = async () => {
    if (!selectedTask || !selectedStaffId) return;
    
    setAssigning(true);
    
    // Update the verification record with the assigned staff
    const { error } = await supabase
      .from("verifications")
      .update({ assigned_staff_id: selectedStaffId })
      .eq("task_id", selectedTask.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign staff member",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Staff Assigned",
        description: "Team member has been assigned to this task",
      });
      setSelectedTask(null);
      setSelectedStaffId("");
    }
    
    setAssigning(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Assigned</Badge>;
      case "pending_review":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><UserCheck className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (proLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // Show upgrade card if not Pro
  if (!isPro) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container max-w-2xl py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <ProUpgradeCard />
        </main>
        <BottomNav />
      </div>
    );
  }

  const companyDetails = proProfile?.company_details as { company_name?: string; registration_number?: string } | null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{companyDetails?.company_name || "Agency Dashboard"}</h1>
                <ProBadge tier="pro" size="lg" />
              </div>
              <p className="text-muted-foreground">Manage your team and dispatch verifications</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground">
                {teamMembers.filter(m => m.status === 'active').length} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedTasks.length}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReview.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
              <p className="text-xs text-muted-foreground">Total tasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dispatch" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dispatch" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Dispatch Center</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team Hub</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
          </TabsList>

          {/* Dispatch Center Tab */}
          <TabsContent value="dispatch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Dispatch Center
                </CardTitle>
                <CardDescription>
                  View active tasks and dispatch staff members to locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignedTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active tasks to dispatch</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/browse')}
                    >
                      Browse Available Tasks
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="h-[400px] rounded-lg overflow-hidden border">
                      <TaskMapView tasks={assignedTasks} userLocation={null} />
                    </div>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {assignedTasks.map((task) => (
                          <Card key={task.id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{task.title}</h4>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {task.address}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">₦{task.bounty_amount}</Badge>
                                    {getStatusBadge(task.status)}
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  onClick={() => setSelectedTask(task)}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Hub Tab */}
          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>All Agency Tasks</CardTitle>
                <CardDescription>View all tasks assigned to your agency</CardDescription>
              </CardHeader>
              <CardContent>
                {agencyTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Bounty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencyTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {task.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[150px] truncate">
                            {task.address}
                          </TableCell>
                          <TableCell className="font-bold">₦{task.bounty_amount}</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/task/${task.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <WalletCard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Assign Staff Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff Member</DialogTitle>
            <DialogDescription>
              Select a team member to dispatch to this task
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold">{selectedTask.title}</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {selectedTask.address}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Staff Member</label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers
                      .filter(m => m.status === 'active')
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {member.staff_name}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignStaff} 
              disabled={assigning || !selectedStaffId}
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Assign Staff
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
