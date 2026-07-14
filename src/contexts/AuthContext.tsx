import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'requester' | 'voucher' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: AppRole | null;
  allRoles: AppRole[];
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchRole: (role: AppRole) => Promise<{ error: Error | null }>;
  addRole: (role: AppRole) => Promise<{ error: Error | null }>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [allRoles, setAllRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      // Use the RPC function to get roles and active role
      const { data, error } = await supabase.rpc('get_user_roles');
      
      if (error) {
        console.error('Error fetching roles:', error);
        // Fallback to direct query
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map(r => r.role as AppRole);
          setAllRoles(roles);
          const hasAdminRole = roles.includes('admin');
          setIsAdmin(hasAdminRole);
          
          // Default to first non-admin role
          const primaryRole = roles.find(r => r !== 'admin') || roles[0];
          setUserRole(primaryRole);
        }
        return;
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const jsonData = data as { roles?: string[]; active_role?: string; is_admin?: boolean };
        const roles = (jsonData.roles || []) as AppRole[];
        const activeRole = jsonData.active_role as AppRole | null;
        const adminStatus = jsonData.is_admin as boolean;

        setAllRoles(roles);
        setIsAdmin(adminStatus);
        
        // Use active_role from DB if set, otherwise fallback
        if (activeRole && roles.includes(activeRole)) {
          setUserRole(activeRole);
        } else if (roles.length > 0) {
          const primaryRole = roles.find(r => r !== 'admin') || roles[0];
          setUserRole(primaryRole);
        }
      }
    } catch (err) {
      console.error('Error in fetchUserRoles:', err);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    if (user) {
      await fetchUserRoles(user.id);
    }
  }, [user, fetchUserRoles]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setAllRoles([]);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoles]);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      return { error };
    }

    // Insert role after signup via SECURITY DEFINER RPC (client cannot directly insert into user_roles)
    if (data.user) {
      const { data: rpcData, error: roleError } = await supabase.rpc('assign_signup_role', { p_role: role });

      if (roleError) {
        return { error: roleError };
      }
      const j = rpcData as { success?: boolean; error?: string } | null;
      if (j && j.success === false) {
        return { error: new Error(j.error || 'Failed to assign role') };
      }

      // Set active role
      await supabase
        .from('profiles')
        .update({ active_role: role })
        .eq('id', data.user.id);

      setUserRole(role);
      setAllRoles([role]);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setAllRoles([]);
    setIsAdmin(false);
  };

  const switchRole = async (role: AppRole): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    if (!allRoles.includes(role)) {
      return { error: new Error('User does not have this role') };
    }

    try {
      const { data, error } = await supabase.rpc('set_active_role', { p_role: role });
      
      if (error) throw error;
      
      const jsonData = data as { success?: boolean; error?: string } | null;
      if (jsonData && jsonData.success) {
        setUserRole(role);
        return { error: null };
      } else {
        return { error: new Error(jsonData?.error || 'Failed to switch role') };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const addRole = async (role: AppRole): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    if (allRoles.includes(role)) {
      // Already has role, just switch to it
      return switchRole(role);
    }

    try {
      const { data, error } = await supabase.rpc('add_user_role', { p_role: role });
      
      if (error) throw error;
      
      const jsonData = data as { success?: boolean; error?: string } | null;
      if (jsonData && jsonData.success) {
        setAllRoles(prev => [...prev, role]);
        setUserRole(role);
        return { error: null };
      } else {
        return { error: new Error(jsonData?.error || 'Failed to add role') };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      allRoles,
      isAdmin,
      signUp,
      signIn,
      signOut,
      switchRole,
      addRole,
      refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
