import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProVoucher } from "@/hooks/useProVoucher";
import { 
  Users, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Check, 
  X,
  Loader2,
  Lock,
  Trash2,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export function TeamManagement() {
  const { 
    teamMembers, 
    addTeamMember, 
    updateTeamMemberStatus,
    removeTeamMember,
    isPro,
    loading 
  } = useProVoucher();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddMember = async () => {
    if (!staffName || !staffEmail || !staffPin) return;
    
    setSubmitting(true);
    const result = await addTeamMember(staffName, staffEmail, staffPin);
    setSubmitting(false);
    
    if (result.success) {
      setDialogOpen(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPin("");
    }
  };

  const generatePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setStaffPin(pin);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="h-3 w-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20"><X className="h-3 w-3 mr-1" />Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isPro) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
          <p className="text-muted-foreground max-w-sm">
            Team management is available for Pro accounts. Upgrade to add and manage staff members.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Manage your verification team
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new staff member who can perform verifications on behalf of your company.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Full Name</Label>
                <Input
                  id="staff-name"
                  placeholder="e.g., John Doe"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-email">Email Address</Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="e.g., john@company.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-pin">Login PIN Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="staff-pin"
                    placeholder="6-digit PIN"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    maxLength={6}
                  />
                  <Button type="button" variant="outline" onClick={generatePin}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This PIN will be used by the staff member to log in and perform verifications
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddMember} 
                disabled={submitting || !staffName || !staffEmail || !staffPin}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Member"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No team members yet</p>
            <p className="text-sm">Add staff members to delegate verifications</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.staff_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {member.staff_email}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === 'active' ? (
                          <DropdownMenuItem onClick={() => updateTeamMemberStatus(member.id, 'inactive')}>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => updateTeamMemberStatus(member.id, 'active')}>
                            <ToggleRight className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => removeTeamMember(member.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
