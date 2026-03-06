import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Settings, Palette, Save, Loader2, Trash2, UserPlus, Shield, Search, RefreshCw, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: 'requester' | 'voucher' | 'admin';
  email?: string;
  full_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  trust_score?: number;
  created_at?: string;
}

interface SiteSettings {
  siteName: string;
  primaryColor: string;
  accentColor: string;
  enableDarkMode: boolean;
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  defaultCurrency: string;
  minBountyAmount: number;
  platformFeePercent: number;
}

type RoleFilter = "all" | "admin" | "voucher" | "requester";

export function AdminManagement() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [newRoleForUser, setNewRoleForUser] = useState<string>("");

  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "VouchVault",
    primaryColor: "#8b5cf6",
    accentColor: "#f97316",
    enableDarkMode: true,
    maintenanceMode: false,
    allowNewSignups: true,
    defaultCurrency: "NGN",
    minBountyAmount: 500,
    platformFeePercent: 5,
  });

  useEffect(() => {
    fetchUsers();
    loadSettings();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("id, user_id, role, created_at");
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) { setUsers([]); setLoading(false); return; }

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, is_verified, trust_score").in("id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);

      const userRoles = roles.map(r => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role as 'requester' | 'voucher' | 'admin',
        full_name: profileMap[r.user_id]?.full_name || "Unknown User",
        avatar_url: profileMap[r.user_id]?.avatar_url || null,
        is_verified: profileMap[r.user_id]?.is_verified || false,
        trust_score: profileMap[r.user_id]?.trust_score || 5.0,
        created_at: r.created_at,
      }));

      setUsers(userRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    // Try loading from platform_settings table first
    const { data } = await supabase.from("platform_settings").select("setting_key, setting_value");
    if (data && data.length > 0) {
      const settingsMap: Record<string, any> = {};
      data.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
      setSettings(prev => ({
        ...prev,
        ...(settingsMap.site_config || {}),
      }));
    } else {
      const saved = localStorage.getItem("admin_site_settings");
      if (saved) setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to platform_settings table for persistence
      const { error } = await supabase.from("platform_settings").upsert({
        setting_key: "site_config",
        setting_value: settings as any,
        description: "Main site configuration",
      }, { onConflict: "setting_key" });

      if (error) throw error;

      // Also save locally as fallback
      localStorage.setItem("admin_site_settings", JSON.stringify(settings));
      document.documentElement.style.setProperty("--primary", settings.primaryColor);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addAdminUser = async () => {
    if (!newAdminEmail.trim()) { toast.error("Please enter an email"); return; }
    setAddingAdmin(true);
    try {
      // Look up user by matching profiles (we can't query auth.users, search by name/partial)
      toast.info("Admin invitation: use the user detail dialog to assign roles to specific users.");
    } finally {
      setAddingAdmin(false);
      setNewAdminEmail("");
    }
  };

  const addRoleToUser = async (userId: string, role: string) => {
    try {
      // Check if role already exists
      const existing = users.find(u => u.user_id === userId && u.role === role);
      if (existing) { toast.info("User already has this role"); return; }

      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;

      toast.success(`${role} role added successfully`);
      setSelectedUser(null);
      setNewRoleForUser("");
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to add role");
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== roleId));
      toast.success("Role removed successfully");
    } catch {
      toast.error("Failed to remove role");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "voucher": return "default" as const;
      default: return "secondary" as const;
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch = !searchQuery ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const adminCount = users.filter(u => u.role === "admin").length;
  const voucherCount = users.filter(u => u.role === "voucher").length;
  const requesterCount = users.filter(u => u.role === "requester").length;
  const uniqueUsers = new Set(users.map(u => u.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{uniqueUsers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{adminCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vouchers</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{voucherCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requesters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{requesterCount}</div></CardContent>
        </Card>
      </div>

      {/* User Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />User Role Management</CardTitle>
          <CardDescription>Manage user roles and permissions with database persistence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={roleFilter} onValueChange={v => setRoleFilter(v as RoleFilter)}>
              <TabsList>
                <TabsTrigger value="all">All ({users.length})</TabsTrigger>
                <TabsTrigger value="admin">Admin ({adminCount})</TabsTrigger>
                <TabsTrigger value="voucher">Voucher ({voucherCount})</TabsTrigger>
                <TabsTrigger value="requester">Requester ({requesterCount})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={fetchUsers}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.full_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          <Shield className="w-3 h-3 mr-1" />{user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_verified ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Unverified</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">Trust: {user.trust_score?.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedUser(user); setNewRoleForUser(""); }}>
                            <Eye className="h-4 w-4 mr-1" />Manage
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeRole(user.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Site Configuration</CardTitle>
          <CardDescription>Configure platform settings (persisted to database)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={settings.defaultCurrency} onValueChange={v => setSettings(s => ({ ...s, defaultCurrency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="GBP">British Pound (£)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minimum Bounty Amount</Label>
              <Input type="number" value={settings.minBountyAmount} onChange={e => setSettings(s => ({ ...s, minBountyAmount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Platform Fee (%)</Label>
              <Input type="number" value={settings.platformFeePercent} onChange={e => setSettings(s => ({ ...s, platformFeePercent: Number(e.target.value) }))} max={20} min={0} />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label>Allow New Signups</Label><p className="text-sm text-muted-foreground">Enable new user registrations</p></div>
              <Switch checked={settings.allowNewSignups} onCheckedChange={c => setSettings(s => ({ ...s, allowNewSignups: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Maintenance Mode</Label><p className="text-sm text-muted-foreground">Temporarily disable the platform</p></div>
              <Switch checked={settings.maintenanceMode} onCheckedChange={c => setSettings(s => ({ ...s, maintenanceMode: c }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Appearance</CardTitle>
          <CardDescription>Customize the platform look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={settings.primaryColor} onChange={e => setSettings(s => ({ ...s, primaryColor: e.target.value }))} className="w-12 h-10 p-1" />
                <Input value={settings.primaryColor} onChange={e => setSettings(s => ({ ...s, primaryColor: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} className="w-12 h-10 p-1" />
                <Input value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Dark Mode Support</Label><p className="text-sm text-muted-foreground">Allow users to toggle dark mode</p></div>
            <Switch checked={settings.enableDarkMode} onCheckedChange={c => setSettings(s => ({ ...s, enableDarkMode: c }))} />
          </div>
          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Settings
          </Button>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Manage User</DialogTitle>
            <DialogDescription>View details and manage roles for this user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{selectedUser.full_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser.full_name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUser.user_id}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Current Role</span><Badge variant={getRoleBadgeVariant(selectedUser.role)}>{selectedUser.role}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Verified</span><span>{selectedUser.is_verified ? "✅ Yes" : "❌ No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trust Score</span><span>{selectedUser.trust_score?.toFixed(1)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Existing Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {users.filter(u => u.user_id === selectedUser.user_id).map(r => (
                    <Badge key={r.id} variant={getRoleBadgeVariant(r.role)} className="gap-1">
                      {r.role}
                      <button onClick={() => removeRole(r.id)} className="ml-1 hover:text-destructive"><XCircle className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Add New Role</Label>
                <div className="flex gap-2">
                  <Select value={newRoleForUser} onValueChange={setNewRoleForUser}>
                    <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="requester">Requester</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => newRoleForUser && addRoleToUser(selectedUser.user_id, newRoleForUser)} disabled={!newRoleForUser}>
                    <UserPlus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}