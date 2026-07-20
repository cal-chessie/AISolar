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
      // Phase 4 tables — added manually (regenerate from Supabase when schema syncs)
      ai_config: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      agent_prompts: {
        Row: {
          id: string
          agent_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          version?: number
          system_prompt: string
          user_prompt_template: string
          model?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          version?: number
          system_prompt?: string
          user_prompt_template?: string
          model?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          id: string
          agent_id: string
          trigger_type: string
          trigger_detail: string | null
          status: string
          lead_id: string | null
          inputs: unknown | null
          outputs: unknown | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          duration_ms: number | null
          created_at: string
          // Phase 4 LLM cost tracking
          cost_usd: number | null
          model: string | null
          prompt_tokens: number | null
          completion_tokens: number | null
          worker_id: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          trigger_type: string
          trigger_detail?: string | null
          status: string
          lead_id?: string | null
          inputs?: unknown | null
          outputs?: unknown | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          created_at?: string
          cost_usd?: number | null
          model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          worker_id?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          trigger_type?: string
          trigger_detail?: string | null
          status?: string
          lead_id?: string | null
          inputs?: unknown | null
          outputs?: unknown | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          created_at?: string
          cost_usd?: number | null
          model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          worker_id?: string | null
        }
        Relationships: []
      }
      agent_queue: {
        Row: {
          id: string
          agent_id: string
          lead_id: string | null
          trigger_data: unknown | null
          priority: number | null
          status: string
          attempts: number | null
          max_attempts: number | null
          run_after: string | null
          locked_until: string | null
          failed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          lead_id?: string | null
          trigger_data?: unknown | null
          priority?: number | null
          status?: string
          attempts?: number | null
          max_attempts?: number | null
          run_after?: string | null
          locked_until?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          lead_id?: string | null
          trigger_data?: unknown | null
          priority?: number | null
          status?: string
          attempts?: number | null
          max_attempts?: number | null
          run_after?: string | null
          locked_until?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          lead_id: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
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
          proposal_id: string | null
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
          proposal_id?: string | null
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
          proposal_id?: string | null
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
          {
            foreignKeyName: "assignments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
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
      follow_up_settings: {
        Row: {
          created_at: string
          id: string
          threshold_days: number
          updated_at: string
          workflow_stage: string
        }
        Insert: {
          created_at?: string
          id?: string
          threshold_days?: number
          updated_at?: string
          workflow_stage: string
        }
        Update: {
          created_at?: string
          id?: string
          threshold_days?: number
          updated_at?: string
          workflow_stage?: string
        }
        Relationships: []
      }
      installation_checklists: {
        Row: {
          battery_installed: boolean | null
          cable_routing_complete: boolean | null
          completion_notes: string | null
          created_at: string
          ct_clamp_location: string | null
          customer_app_setup: boolean | null
          customer_signature: string | null
          customer_signed_at: string | null
          earth_bond_confirmed: boolean | null
          export_limiter_required: boolean | null
          flashing_installed: boolean | null
          id: string
          installer_id: string | null
          installer_signature: string | null
          installer_signed_at: string | null
          inverter_installed: boolean | null
          isolator_installed: boolean | null
          lead_id: string
          main_fuse_size: string | null
          monitoring_online: boolean | null
          myenergi_setup: boolean | null
          network_provider: string | null
          panels_installed: boolean | null
          proposal_id: string
          rcd_present_tested: boolean | null
          roof_tiles_secure: boolean | null
          status: string | null
          updated_at: string
          weatherproofing_complete: boolean | null
        }
        Insert: {
          battery_installed?: boolean | null
          cable_routing_complete?: boolean | null
          completion_notes?: string | null
          created_at?: string
          ct_clamp_location?: string | null
          customer_app_setup?: boolean | null
          customer_signature?: string | null
          customer_signed_at?: string | null
          earth_bond_confirmed?: boolean | null
          export_limiter_required?: boolean | null
          flashing_installed?: boolean | null
          id?: string
          installer_id?: string | null
          installer_signature?: string | null
          installer_signed_at?: string | null
          inverter_installed?: boolean | null
          isolator_installed?: boolean | null
          lead_id: string
          main_fuse_size?: string | null
          monitoring_online?: boolean | null
          myenergi_setup?: boolean | null
          network_provider?: string | null
          panels_installed?: boolean | null
          proposal_id: string
          rcd_present_tested?: boolean | null
          roof_tiles_secure?: boolean | null
          status?: string | null
          updated_at?: string
          weatherproofing_complete?: boolean | null
        }
        Update: {
          battery_installed?: boolean | null
          cable_routing_complete?: boolean | null
          completion_notes?: string | null
          created_at?: string
          ct_clamp_location?: string | null
          customer_app_setup?: boolean | null
          customer_signature?: string | null
          customer_signed_at?: string | null
          earth_bond_confirmed?: boolean | null
          export_limiter_required?: boolean | null
          flashing_installed?: boolean | null
          id?: string
          installer_id?: string | null
          installer_signature?: string | null
          installer_signed_at?: string | null
          inverter_installed?: boolean | null
          isolator_installed?: boolean | null
          lead_id?: string
          main_fuse_size?: string | null
          monitoring_online?: boolean | null
          myenergi_setup?: boolean | null
          network_provider?: string | null
          panels_installed?: boolean | null
          proposal_id?: string
          rcd_present_tested?: boolean | null
          roof_tiles_secure?: boolean | null
          status?: string | null
          updated_at?: string
          weatherproofing_complete?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_checklists_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_checklists_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_checklists_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_photos: {
        Row: {
          checklist_id: string
          created_at: string
          description: string | null
          id: string
          photo_type: string
          photo_url: string
          uploaded_by: string | null
        }
        Insert: {
          checklist_id: string
          created_at?: string
          description?: string | null
          id?: string
          photo_type: string
          photo_url: string
          uploaded_by?: string | null
        }
        Update: {
          checklist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          photo_type?: string
          photo_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_photos_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "installation_checklists"
            referencedColumns: ["id"]
          },
        ]
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
          annual_consumption_kwh: number | null
          assigned_consultant_id: string | null  // Phase 1 fix
          owner_user_id: string | null  // Phase 1 fix
          created_at: string
          email: string
          id: string
          last_contacted_at: string | null
          monthly_bill: number | null
          mprn: string | null
          name: string
          notes: string | null
          phone: string | null
          property_type: string | null
          score: number | null
          source: string | null
          updated_at: string
          workflow_stage: string | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          annual_consumption_kwh?: number | null
          assigned_consultant_id?: string | null
          owner_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          last_contacted_at?: string | null
          monthly_bill?: number | null
          mprn?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          score?: number | null
          updated_at?: string
          workflow_stage?: string | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          annual_consumption_kwh?: number | null
          created_at?: string
          email?: string
          id?: string
          last_contacted_at?: string | null
          monthly_bill?: number | null
          mprn?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          score?: number | null
          updated_at?: string
          workflow_stage?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_enabled: boolean | null
          digest_frequency: string | null
          digest_time: string | null
          email_contract_signed: boolean | null
          email_installation_scheduled: boolean | null
          email_payment_received: boolean | null
          email_proposal_approved: boolean | null
          email_stage_changes: boolean | null
          email_survey_completed: boolean | null
          id: string
          inapp_contract_signed: boolean | null
          inapp_installation_scheduled: boolean | null
          inapp_payment_received: boolean | null
          inapp_proposal_approved: boolean | null
          inapp_stage_changes: boolean | null
          inapp_survey_completed: boolean | null
          last_digest_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          digest_time?: string | null
          email_contract_signed?: boolean | null
          email_installation_scheduled?: boolean | null
          email_payment_received?: boolean | null
          email_proposal_approved?: boolean | null
          email_stage_changes?: boolean | null
          email_survey_completed?: boolean | null
          id?: string
          inapp_contract_signed?: boolean | null
          inapp_installation_scheduled?: boolean | null
          inapp_payment_received?: boolean | null
          inapp_proposal_approved?: boolean | null
          inapp_stage_changes?: boolean | null
          inapp_survey_completed?: boolean | null
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          digest_time?: string | null
          email_contract_signed?: boolean | null
          email_installation_scheduled?: boolean | null
          email_payment_received?: boolean | null
          email_proposal_approved?: boolean | null
          email_stage_changes?: boolean | null
          email_survey_completed?: boolean | null
          id?: string
          inapp_contract_signed?: boolean | null
          inapp_installation_scheduled?: boolean | null
          inapp_payment_received?: boolean | null
          inapp_proposal_approved?: boolean | null
          inapp_stage_changes?: boolean | null
          inapp_survey_completed?: boolean | null
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      project_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          lead_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      seai_applications: {
        Row: {
          application_number: string | null
          approved_at: string | null
          ber_cert_uploaded: boolean | null
          completion_cert_uploaded: boolean | null
          created_at: string
          engineer_email: string | null
          engineer_notes: string | null
          engineer_reviewed_at: string | null
          grant_amount: number | null
          id: string
          invoice_uploaded: boolean | null
          lead_id: string
          notes: string | null
          photos_uploaded: boolean | null
          property_type: string | null
          proposal_id: string
          rejected_at: string | null
          rejection_reason: string | null
          requires_engineer_review: boolean | null
          status: string | null
          submitted_at: string | null
          system_size_kw: number | null
          updated_at: string
        }
        Insert: {
          application_number?: string | null
          approved_at?: string | null
          ber_cert_uploaded?: boolean | null
          completion_cert_uploaded?: boolean | null
          created_at?: string
          engineer_email?: string | null
          engineer_notes?: string | null
          engineer_reviewed_at?: string | null
          grant_amount?: number | null
          id?: string
          invoice_uploaded?: boolean | null
          lead_id: string
          notes?: string | null
          photos_uploaded?: boolean | null
          property_type?: string | null
          proposal_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requires_engineer_review?: boolean | null
          status?: string | null
          submitted_at?: string | null
          system_size_kw?: number | null
          updated_at?: string
        }
        Update: {
          application_number?: string | null
          approved_at?: string | null
          ber_cert_uploaded?: boolean | null
          completion_cert_uploaded?: boolean | null
          created_at?: string
          engineer_email?: string | null
          engineer_notes?: string | null
          engineer_reviewed_at?: string | null
          grant_amount?: number | null
          id?: string
          invoice_uploaded?: boolean | null
          lead_id?: string
          notes?: string | null
          photos_uploaded?: boolean | null
          property_type?: string | null
          proposal_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requires_engineer_review?: boolean | null
          status?: string | null
          submitted_at?: string | null
          system_size_kw?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seai_applications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seai_applications_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      seai_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seai_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "seai_applications"
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
      app_role: "admin" | "consultant" | "installer" | "customer"
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
      app_role: ["admin", "consultant", "installer", "customer"],
    },
  },
} as const
