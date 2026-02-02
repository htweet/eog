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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Settings, Palette, Save, Loader2, Trash2, UserPlus, Shield } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: 'requester' | 'voucher' | 'admin';
  email?: string;
  full_name?: string;
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

export function AdminManagement() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "VouchVault",
    primaryColor: "#8b5cf6",
    accentColor: "#f97316",
    enableDarkMode: true,
    maintenanceMode: false,
    allowNewSignups: true,
    defaultCurrency: "NGN",
    minBountyAmount: 500,
    platformFeePercent: 5
  });

  useEffect(() => {
    fetchUsers();
    loadSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch user roles first
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(roles.map(r => r.user_id))];

      // Fetch profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create profile lookup map
      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, { id: string; full_name: string | null }>);

      // Combine roles with profiles
      const userRoles = roles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role as 'requester' | 'voucher' | 'admin',
        full_name: profileMap[r.user_id]?.full_name || 'Unknown User'
      }));

      setUsers(userRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('admin_site_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    setSaving(true);
    try {
      localStorage.setItem('admin_site_settings', JSON.stringify(settings));
      
      // Apply theme colors dynamically
      document.documentElement.style.setProperty('--primary', settings.primaryColor);
      
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addAdminUser = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setAddingAdmin(true);
    try {
      // Note: Adding admin by email requires backend support
      // For now, show info message
      toast.info("Admin invitation system coming soon. Use database tools for now.");
      
    } catch (error: any) {
      toast.error(error.message || "Failed to add admin");
    } finally {
      setAddingAdmin(false);
      setNewAdminEmail("");
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== roleId));
      toast.success("Role removed successfully");
    } catch (error) {
      toast.error("Failed to remove role");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'voucher': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Role Management
          </CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email to add as admin..."
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addAdminUser} disabled={addingAdmin}>
              {addingAdmin ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Admin
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRole(user.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Site Configuration
          </CardTitle>
          <CardDescription>Configure platform settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input
                value={settings.siteName}
                onChange={(e) => setSettings(s => ({ ...s, siteName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(value) => setSettings(s => ({ ...s, defaultCurrency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                type="number"
                value={settings.minBountyAmount}
                onChange={(e) => setSettings(s => ({ ...s, minBountyAmount: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform Fee (%)</Label>
              <Input
                type="number"
                value={settings.platformFeePercent}
                onChange={(e) => setSettings(s => ({ ...s, platformFeePercent: Number(e.target.value) }))}
                max={20}
                min={0}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow New Signups</Label>
                <p className="text-sm text-muted-foreground">Enable new user registrations</p>
              </div>
              <Switch
                checked={settings.allowNewSignups}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, allowNewSignups: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Temporarily disable the platform</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, maintenanceMode: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the platform look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                  placeholder="#8b5cf6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={settings.accentColor}
                  onChange={(e) => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                  placeholder="#f97316"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode Support</Label>
              <p className="text-sm text-muted-foreground">Allow users to toggle dark mode</p>
            </div>
            <Switch
              checked={settings.enableDarkMode}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, enableDarkMode: checked }))}
            />
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
