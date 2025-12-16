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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_by: string
          assignment_type: string
          completed_date: string | null
          created_at: string
          id: string
          installer_id: string
          lead_id: string
          notes: string | null
          priority: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assignment_type: string
          completed_date?: string | null
          created_at?: string
          id?: string
          installer_id: string
          lead_id: string
          notes?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assignment_type?: string
          completed_date?: string | null
          created_at?: string
          id?: string
          installer_id?: string
          lead_id?: string
          notes?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          gdpr_consent: boolean
          gdpr_consent_text: string | null
          id: string
          lead_id: string
          proposal_id: string
          signature_data: string | null
          signed_at: string
          signed_by_email: string
          signed_by_name: string
        }
        Insert: {
          created_at?: string
          gdpr_consent?: boolean
          gdpr_consent_text?: string | null
          id?: string
          lead_id: string
          proposal_id: string
          signature_data?: string | null
          signed_at?: string
          signed_by_email: string
          signed_by_name: string
        }
        Update: {
          created_at?: string
          gdpr_consent?: boolean
          gdpr_consent_text?: string | null
          id?: string
          lead_id?: string
          proposal_id?: string
          signature_data?: string | null
          signed_at?: string
          signed_by_email?: string
          signed_by_name?: string
        }
        Relationships: []
      }
      installers: {
        Row: {
          availability_status: string | null
          certification_level: string | null
          created_at: string
          id: string
          specialization: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          availability_status?: string | null
          certification_level?: string | null
          created_at?: string
          id?: string
          specialization?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          availability_status?: string | null
          certification_level?: string | null
          created_at?: string
          id?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          contract_id: string | null
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_at: string | null
          due_date: string | null
          final_amount: number | null
          final_paid: boolean | null
          final_paid_at: string | null
          id: string
          invoice_number: string
          lead_id: string
          notes: string | null
          proposal_id: string
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          due_date?: string | null
          final_amount?: number | null
          final_paid?: boolean | null
          final_paid_at?: string | null
          id?: string
          invoice_number: string
          lead_id: string
          notes?: string | null
          proposal_id: string
          status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          due_date?: string | null
          final_amount?: number | null
          final_paid?: boolean | null
          final_paid_at?: string | null
          id?: string
          invoice_number?: string
          lead_id?: string
          notes?: string | null
          proposal_id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          access_token: string | null
          address: string | null
          created_at: string
          email: string
          id: string
          monthly_bill: number | null
          name: string
          notes: string | null
          phone: string | null
          property_type: string | null
          score: number | null
          status: string | null
          updated_at: string
          workflow_stage: string | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          created_at?: string
          email: string
          id?: string
          monthly_bill?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string
          workflow_stage?: string | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          monthly_bill?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string
          workflow_stage?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          approved_at: string | null
          assigned_installer_id: string | null
          battery_capacity_kwh: number | null
          battery_storage: boolean | null
          confirmed_install_date: string | null
          consultant_id: string
          created_at: string
          current_annual_consumption_kwh: number | null
          current_panel_capacity: string | null
          electrical_panel_upgrade_needed: boolean | null
          energy_offset_percentage: number | null
          estimated_annual_production_kwh: number | null
          id: string
          installation_cost: number | null
          installation_notes: string | null
          installation_status: string | null
          installation_timeline_weeks: number | null
          inverter_type: string | null
          lead_id: string
          monthly_savings: number | null
          net_cost: number | null
          new_panel_capacity: string | null
          panel_count: number | null
          panel_type: string | null
          payback_period_years: number | null
          preferred_install_dates: Json | null
          presented_at: string | null
          property_type: string | null
          requires_review: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          roof_condition: string | null
          roof_material: string | null
          roof_orientation: string | null
          roof_pitch: number | null
          roof_type: string | null
          seai_grant: number | null
          selected_products: Json | null
          shading_level: string | null
          special_requirements: string | null
          status: string | null
          system_cost: number | null
          system_size_kw: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          assigned_installer_id?: string | null
          battery_capacity_kwh?: number | null
          battery_storage?: boolean | null
          confirmed_install_date?: string | null
          consultant_id: string
          created_at?: string
          current_annual_consumption_kwh?: number | null
          current_panel_capacity?: string | null
          electrical_panel_upgrade_needed?: boolean | null
          energy_offset_percentage?: number | null
          estimated_annual_production_kwh?: number | null
          id?: string
          installation_cost?: number | null
          installation_notes?: string | null
          installation_status?: string | null
          installation_timeline_weeks?: number | null
          inverter_type?: string | null
          lead_id: string
          monthly_savings?: number | null
          net_cost?: number | null
          new_panel_capacity?: string | null
          panel_count?: number | null
          panel_type?: string | null
          payback_period_years?: number | null
          preferred_install_dates?: Json | null
          presented_at?: string | null
          property_type?: string | null
          requires_review?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roof_condition?: string | null
          roof_material?: string | null
          roof_orientation?: string | null
          roof_pitch?: number | null
          roof_type?: string | null
          seai_grant?: number | null
          selected_products?: Json | null
          shading_level?: string | null
          special_requirements?: string | null
          status?: string | null
          system_cost?: number | null
          system_size_kw?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          assigned_installer_id?: string | null
          battery_capacity_kwh?: number | null
          battery_storage?: boolean | null
          confirmed_install_date?: string | null
          consultant_id?: string
          created_at?: string
          current_annual_consumption_kwh?: number | null
          current_panel_capacity?: string | null
          electrical_panel_upgrade_needed?: boolean | null
          energy_offset_percentage?: number | null
          estimated_annual_production_kwh?: number | null
          id?: string
          installation_cost?: number | null
          installation_notes?: string | null
          installation_status?: string | null
          installation_timeline_weeks?: number | null
          inverter_type?: string | null
          lead_id?: string
          monthly_savings?: number | null
          net_cost?: number | null
          new_panel_capacity?: string | null
          panel_count?: number | null
          panel_type?: string | null
          payback_period_years?: number | null
          preferred_install_dates?: Json | null
          presented_at?: string | null
          property_type?: string | null
          requires_review?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roof_condition?: string | null
          roof_material?: string | null
          roof_orientation?: string | null
          roof_pitch?: number | null
          roof_type?: string | null
          seai_grant?: number | null
          selected_products?: Json | null
          shading_level?: string | null
          special_requirements?: string | null
          status?: string | null
          system_cost?: number | null
          system_size_kw?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_assigned_installer_id_fkey"
            columns: ["assigned_installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      site_surveys: {
        Row: {
          access_notes: string | null
          attic_access: string | null
          completed_at: string | null
          created_at: string
          customer_availability: string | null
          electrical_panel_capacity: string | null
          electrical_panel_condition: string | null
          estimated_installation_cost: number | null
          existing_solar: boolean | null
          grid_connection_type: string | null
          id: string
          installation_notes: string | null
          lead_id: string
          meter_location: string | null
          nearby_obstructions: string | null
          parking_situation: string | null
          property_storeys: number | null
          recommended_panel_count: number | null
          recommended_system_size: number | null
          roof_condition: string | null
          roof_material: string | null
          roof_orientation: string | null
          roof_pitch: number | null
          roof_type: string | null
          scaffolding_required: string | null
          shading_analysis: string | null
          special_requirements: string | null
          status: string | null
          survey_date: string | null
          surveyor_id: string
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          attic_access?: string | null
          completed_at?: string | null
          created_at?: string
          customer_availability?: string | null
          electrical_panel_capacity?: string | null
          electrical_panel_condition?: string | null
          estimated_installation_cost?: number | null
          existing_solar?: boolean | null
          grid_connection_type?: string | null
          id?: string
          installation_notes?: string | null
          lead_id: string
          meter_location?: string | null
          nearby_obstructions?: string | null
          parking_situation?: string | null
          property_storeys?: number | null
          recommended_panel_count?: number | null
          recommended_system_size?: number | null
          roof_condition?: string | null
          roof_material?: string | null
          roof_orientation?: string | null
          roof_pitch?: number | null
          roof_type?: string | null
          scaffolding_required?: string | null
          shading_analysis?: string | null
          special_requirements?: string | null
          status?: string | null
          survey_date?: string | null
          surveyor_id: string
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          attic_access?: string | null
          completed_at?: string | null
          created_at?: string
          customer_availability?: string | null
          electrical_panel_capacity?: string | null
          electrical_panel_condition?: string | null
          estimated_installation_cost?: number | null
          existing_solar?: boolean | null
          grid_connection_type?: string | null
          id?: string
          installation_notes?: string | null
          lead_id?: string
          meter_location?: string | null
          nearby_obstructions?: string | null
          parking_situation?: string | null
          property_storeys?: number | null
          recommended_panel_count?: number | null
          recommended_system_size?: number | null
          roof_condition?: string | null
          roof_material?: string | null
          roof_orientation?: string | null
          roof_pitch?: number | null
          roof_type?: string | null
          scaffolding_required?: string | null
          shading_analysis?: string | null
          special_requirements?: string | null
          status?: string | null
          survey_date?: string | null
          surveyor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_surveys_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_products: {
        Row: {
          active: boolean | null
          cost: number
          created_at: string
          currency: string | null
          datasheet_url: string | null
          description: string | null
          efficiency_percentage: number | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          lead_time_days: number | null
          manufacturer: string
          model: string
          power_rating: number | null
          product_type: string
          specifications: Json | null
          updated_at: string
          warranty_years: number | null
        }
        Insert: {
          active?: boolean | null
          cost: number
          created_at?: string
          currency?: string | null
          datasheet_url?: string | null
          description?: string | null
          efficiency_percentage?: number | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          lead_time_days?: number | null
          manufacturer: string
          model: string
          power_rating?: number | null
          product_type: string
          specifications?: Json | null
          updated_at?: string
          warranty_years?: number | null
        }
        Update: {
          active?: boolean | null
          cost?: number
          created_at?: string
          currency?: string | null
          datasheet_url?: string | null
          description?: string | null
          efficiency_percentage?: number | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          lead_time_days?: number | null
          manufacturer?: string
          model?: string
          power_rating?: number | null
          product_type?: string
          specifications?: Json | null
          updated_at?: string
          warranty_years?: number | null
        }
        Relationships: []
      }
      survey_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_type: string | null
          photo_url: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_type?: string | null
          photo_url: string
          survey_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_type?: string | null
          photo_url?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_photos_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "consultant" | "installer"
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
      app_role: ["admin", "consultant", "installer"],
    },
  },
} as const
