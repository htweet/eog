export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      escrow_transactions: {
        Row: {
          amount: number
          created_at: string | null
          held_at: string | null
          id: string
          notes: string | null
          platform_fee: number | null
          processed_by: string | null
          refunded_at: string | null
          released_at: string | null
          requester_id: string
          status: Database["public"]["Enums"]["escrow_status"] | null
          task_id: string
          updated_at: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          held_at?: string | null
          id?: string
          notes?: string | null
          platform_fee?: number | null
          processed_by?: string | null
          refunded_at?: string | null
          released_at?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["escrow_status"] | null
          task_id: string
          updated_at?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          held_at?: string | null
          id?: string
          notes?: string | null
          platform_fee?: number | null
          processed_by?: string | null
          refunded_at?: string | null
          released_at?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["escrow_status"] | null
          task_id?: string
          updated_at?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          ended_at: string | null
          id: string
          recording_url: string | null
          started_at: string | null
          status: string
          task_id: string
          viewer_count: number | null
          voucher_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          task_id: string
          viewer_count?: number | null
          voucher_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          task_id?: string
          viewer_count?: number | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          account_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_upgrade_requests: {
        Row: {
          company_name: string
          created_at: string | null
          document_urls: Json | null
          id: string
          registration_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          document_urls?: Json | null
          id?: string
          registration_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          document_urls?: Json | null
          id?: string
          registration_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_upgrade_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_upgrade_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_details: Json | null
          created_at: string | null
          escrow_balance: number | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          trust_score: number | null
          voucher_tier: Database["public"]["Enums"]["voucher_tier"] | null
          wallet_balance: number | null
          withdrawable_balance: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_details?: Json | null
          created_at?: string | null
          escrow_balance?: number | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          trust_score?: number | null
          voucher_tier?: Database["public"]["Enums"]["voucher_tier"] | null
          wallet_balance?: number | null
          withdrawable_balance?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_details?: Json | null
          created_at?: string | null
          escrow_balance?: number | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          trust_score?: number | null
          voucher_tier?: Database["public"]["Enums"]["voucher_tier"] | null
          wallet_balance?: number | null
          withdrawable_balance?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          reviewer_id: string
          task_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reviewer_id: string
          task_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reviewer_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          address: string
          bounty_amount: number
          category: string
          checklist: Json | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          pro_fee_multiplier: number | null
          requester_id: string
          required_tier: Database["public"]["Enums"]["task_tier"] | null
          status: string | null
          title: string
          voucher_id: string | null
        }
        Insert: {
          address: string
          bounty_amount: number
          category: string
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pro_fee_multiplier?: number | null
          requester_id: string
          required_tier?: Database["public"]["Enums"]["task_tier"] | null
          status?: string | null
          title: string
          voucher_id?: string | null
        }
        Update: {
          address?: string
          bounty_amount?: number
          category?: string
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pro_fee_multiplier?: number | null
          requester_id?: string
          required_tier?: Database["public"]["Enums"]["task_tier"] | null
          status?: string | null
          title?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          parent_company_id: string
          staff_email: string
          staff_name: string
          staff_pin_code: string
          status: Database["public"]["Enums"]["staff_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_company_id: string
          staff_email: string
          staff_name: string
          staff_pin_code: string
          status?: Database["public"]["Enums"]["staff_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_company_id?: string
          staff_email?: string
          staff_name?: string
          staff_pin_code?: string
          status?: Database["public"]["Enums"]["staff_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          status: string
          task_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          task_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          task_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          ai_analysis_score: number | null
          assigned_staff_id: string | null
          completed_checklist: Json | null
          device_timestamp: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          submitted_at: string | null
          task_id: string
          video_url: string
        }
        Insert: {
          ai_analysis_score?: number | null
          assigned_staff_id?: string | null
          completed_checklist?: Json | null
          device_timestamp?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          submitted_at?: string | null
          task_id: string
          video_url: string
        }
        Update: {
          ai_analysis_score?: number | null
          assigned_staff_id?: string | null
          completed_checklist?: Json | null
          device_timestamp?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          submitted_at?: string | null
          task_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_settings: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_message: string
          p_task_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_escrow: {
        Args: { p_admin_id?: string; p_reason?: string; p_task_id: string }
        Returns: Json
      }
      release_escrow: {
        Args: { p_admin_id?: string; p_task_id: string; p_voucher_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "requester" | "voucher" | "admin"
      escrow_status: "held" | "released" | "refunded" | "disputed"
      staff_status: "active" | "inactive" | "pending"
      task_tier: "any" | "pro_only"
      voucher_tier: "standard" | "pro" | "pending_pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["requester", "voucher", "admin"],
      escrow_status: ["held", "released", "refunded", "disputed"],
      staff_status: ["active", "inactive", "pending"],
      task_tier: ["any", "pro_only"],
      voucher_tier: ["standard", "pro", "pending_pro"],
    },
  },
} as const
