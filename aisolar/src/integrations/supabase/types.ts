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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
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
      agent_prompts: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          model: string | null
          notes: string | null
          system_prompt: string
          user_prompt_template: string
          version: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          notes?: string | null
          system_prompt: string
          user_prompt_template: string
          version?: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          notes?: string | null
          system_prompt?: string
          user_prompt_template?: string
          version?: number
        }
        Relationships: []
      }
      agent_queue: {
        Row: {
          agent_id: string
          attempts: number
          created_at: string
          failed_at: string | null
          failed_reason: string | null
          id: string
          lead_id: string | null
          locked_until: string | null
          max_attempts: number
          priority: number
          run_after: string
          trigger_data: Json | null
        }
        Insert: {
          agent_id: string
          attempts?: number
          created_at?: string
          failed_at?: string | null
          failed_reason?: string | null
          id?: string
          lead_id?: string | null
          locked_until?: string | null
          max_attempts?: number
          priority?: number
          run_after?: string
          trigger_data?: Json | null
        }
        Update: {
          agent_id?: string
          attempts?: number
          created_at?: string
          failed_at?: string | null
          failed_reason?: string | null
          id?: string
          lead_id?: string | null
          locked_until?: string | null
          max_attempts?: number
          priority?: number
          run_after?: string
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          inputs: Json | null
          lead_id: string | null
          model: string | null
          outputs: Json | null
          prompt_tokens: number | null
          started_at: string | null
          status: string
          trigger_detail: string | null
          trigger_type: string
          worker_id: string | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          inputs?: Json | null
          lead_id?: string | null
          model?: string | null
          outputs?: Json | null
          prompt_tokens?: number | null
          started_at?: string | null
          status: string
          trigger_detail?: string | null
          trigger_type: string
          worker_id?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          inputs?: Json | null
          lead_id?: string | null
          model?: string | null
          outputs?: Json | null
          prompt_tokens?: number | null
          started_at?: string | null
          status?: string
          trigger_detail?: string | null
          trigger_type?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assigned_by: string
          assignment_type: string
          completed_date: string | null
          created_at: string
          id: string
          installer_id: string | null
          installer_name: string | null
          installer_ref: string | null
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
          installer_id?: string | null
          installer_name?: string | null
          installer_ref?: string | null
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
          installer_id?: string | null
          installer_name?: string | null
          installer_ref?: string | null
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
      brands: {
        Row: {
          active: boolean
          boundary_ref: string | null
          created_at: string
          domain: string | null
          id: string
          is_licensed: boolean
          kind: string | null
          name: string
          sort_order: number
          tenant_id: string | null
          theme: Json
        }
        Insert: {
          active?: boolean
          boundary_ref?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_licensed?: boolean
          kind?: string | null
          name: string
          sort_order?: number
          tenant_id?: string | null
          theme?: Json
        }
        Update: {
          active?: boolean
          boundary_ref?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_licensed?: boolean
          kind?: string | null
          name?: string
          sort_order?: number
          tenant_id?: string | null
          theme?: Json
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          id: string
          message: string
          occurred_at: string
          path: string | null
          source: string | null
          stack: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          message: string
          occurred_at?: string
          path?: string | null
          source?: string | null
          stack?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          message?: string
          occurred_at?: string
          path?: string | null
          source?: string | null
          stack?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          captured_at: string
          choices: Json
          consent_key: string
          granted: boolean
          id: string
          source: string | null
          subject_ref: string
        }
        Insert: {
          captured_at?: string
          choices?: Json
          consent_key?: string
          granted: boolean
          id?: string
          source?: string | null
          subject_ref: string
        }
        Update: {
          captured_at?: string
          choices?: Json
          consent_key?: string
          granted?: boolean
          id?: string
          source?: string | null
          subject_ref?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cooling_off_ends_at: string | null
          cooling_off_waived: boolean
          cooling_off_waived_at: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cooling_off_ends_at?: string | null
          cooling_off_waived?: boolean
          cooling_off_waived_at?: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cooling_off_ends_at?: string | null
          cooling_off_waived?: boolean
          cooling_off_waived_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          sender_ref: string | null
          sender_role: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_ref?: string | null
          sender_role: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_ref?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          detail: string | null
          email: string
          message_stream: string | null
          reason: string
          suppressed_at: string
        }
        Insert: {
          detail?: string | null
          email: string
          message_stream?: string | null
          reason: string
          suppressed_at?: string
        }
        Update: {
          detail?: string | null
          email?: string
          message_stream?: string | null
          reason?: string
          suppressed_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          subject: string
          type: string
          updated_at: string
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          active?: boolean
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          subject: string
          type: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          active?: boolean
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          subject?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      esb_submissions: {
        Row: {
          completeness_ready: boolean
          created_at: string
          esb_reference: string | null
          form: string
          id: string
          installer_name: string | null
          lead_id: string
          missing: Json
          mprn: string | null
          pack_document_id: string | null
          pack_sha256: string | null
          pack_storage_path: string | null
          page_count: number | null
          reci_number: string | null
          reject_reason: string | null
          sealed_at: string
          sealed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          supersedes: string | null
          updated_at: string
        }
        Insert: {
          completeness_ready?: boolean
          created_at?: string
          esb_reference?: string | null
          form?: string
          id?: string
          installer_name?: string | null
          lead_id: string
          missing?: Json
          mprn?: string | null
          pack_document_id?: string | null
          pack_sha256?: string | null
          pack_storage_path?: string | null
          page_count?: number | null
          reci_number?: string | null
          reject_reason?: string | null
          sealed_at?: string
          sealed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          supersedes?: string | null
          updated_at?: string
        }
        Update: {
          completeness_ready?: boolean
          created_at?: string
          esb_reference?: string | null
          form?: string
          id?: string
          installer_name?: string | null
          lead_id?: string
          missing?: Json
          mprn?: string | null
          pack_document_id?: string | null
          pack_sha256?: string | null
          pack_storage_path?: string | null
          page_count?: number | null
          reci_number?: string | null
          reject_reason?: string | null
          sealed_at?: string
          sealed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          supersedes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "esb_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esb_submissions_pack_document_id_fkey"
            columns: ["pack_document_id"]
            isOneToOne: false
            referencedRelation: "lead_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esb_submissions_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "esb_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          author_ref: string | null
          body: string
          context: string | null
          created_at: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          author_ref?: string | null
          body: string
          context?: string | null
          created_at?: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          author_ref?: string | null
          body?: string
          context?: string | null
          created_at?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      field_records: {
        Row: {
          lead_id: string
          record: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          lead_id: string
          record?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          lead_id?: string
          record?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_records_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      installed_equipment: {
        Row: {
          ac_rating_kw: string | null
          attested_at: string | null
          attested_by: string | null
          confirmed: boolean
          created_at: string
          export_limit: string | null
          first_connection: string | null
          fitted_model: string | null
          id: string
          lead_id: string
          mismatch_flagged: boolean
          note: string | null
          protection_confirmed: boolean
          rated_current_a: string | null
          serial: string | null
          type_test_cert_ref: string | null
          unit_index: number
          updated_at: string
        }
        Insert: {
          ac_rating_kw?: string | null
          attested_at?: string | null
          attested_by?: string | null
          confirmed?: boolean
          created_at?: string
          export_limit?: string | null
          first_connection?: string | null
          fitted_model?: string | null
          id?: string
          lead_id: string
          mismatch_flagged?: boolean
          note?: string | null
          protection_confirmed?: boolean
          rated_current_a?: string | null
          serial?: string | null
          type_test_cert_ref?: string | null
          unit_index?: number
          updated_at?: string
        }
        Update: {
          ac_rating_kw?: string | null
          attested_at?: string | null
          attested_by?: string | null
          confirmed?: boolean
          created_at?: string
          export_limit?: string | null
          first_connection?: string | null
          fitted_model?: string | null
          id?: string
          lead_id?: string
          mismatch_flagged?: boolean
          note?: string | null
          protection_confirmed?: boolean
          rated_current_a?: string | null
          serial?: string | null
          type_test_cert_ref?: string | null
          unit_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installed_equipment_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      invoice_counters: {
        Row: {
          next_seq: number
          tenant_id: string
          year: number
        }
        Insert: {
          next_seq?: number
          tenant_id: string
          year: number
        }
        Update: {
          next_seq?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          created_at: string
          detail: string | null
          doc_type: string
          emailed_from: string | null
          id: string
          lead_id: string
          original_name: string | null
          sha256: string | null
          size_bytes: number | null
          source: string
          status: string
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          doc_type: string
          emailed_from?: string | null
          id?: string
          lead_id: string
          original_name?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          doc_type?: string
          emailed_from?: string | null
          id?: string
          lead_id?: string
          original_name?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_intake: {
        Row: {
          bill_extracted_at: string | null
          confirmed_available_area_m2: number | null
          confirmed_battery_kwh: number | null
          confirmed_inverter_type: string | null
          confirmed_panel_count: number | null
          confirmed_roof_orientation: string | null
          confirmed_roof_pitch: number | null
          confirmed_roof_type: string | null
          confirmed_shading: string | null
          confirmed_system_size_kw: number | null
          created_at: string
          estimated_20yr_savings: number | null
          estimated_annual_savings: number | null
          estimated_payback_years: number | null
          estimated_system_size_kw: number | null
          extracted_account_name: string | null
          extracted_address: string | null
          extracted_annual_kwh: number | null
          extracted_billing_period: string | null
          extracted_billing_period_kwh: number | null
          extracted_day_night_meter: boolean | null
          extracted_day_usage_kwh: number | null
          extracted_eircode: string | null
          extracted_estimated_reading: boolean | null
          extracted_monthly_bill: number | null
          extracted_mprn: string | null
          extracted_night_rate: number | null
          extracted_night_usage_kwh: number | null
          extracted_notes: string | null
          extracted_premises_type: string | null
          extracted_provider: string | null
          extracted_standing_charge: number | null
          extracted_standing_charge_unit: string | null
          extracted_tariff_name: string | null
          extracted_unit_rate: number | null
          extracted_vat_rate: number | null
          extraction_confidence: string | null
          extraction_raw: Json | null
          finalized_25yr_savings: number | null
          finalized_battery_model: string | null
          finalized_inverter_model: string | null
          finalized_net_cost: number | null
          finalized_panel_model: string | null
          finalized_payback_years: number | null
          finalized_seai_grant: number | null
          finalized_total_cost: number | null
          id: string
          lead_id: string
          solar_offset_pct: number | null
          source: string
          updated_at: string
          year_built: string | null
        }
        Insert: {
          bill_extracted_at?: string | null
          confirmed_available_area_m2?: number | null
          confirmed_battery_kwh?: number | null
          confirmed_inverter_type?: string | null
          confirmed_panel_count?: number | null
          confirmed_roof_orientation?: string | null
          confirmed_roof_pitch?: number | null
          confirmed_roof_type?: string | null
          confirmed_shading?: string | null
          confirmed_system_size_kw?: number | null
          created_at?: string
          estimated_20yr_savings?: number | null
          estimated_annual_savings?: number | null
          estimated_payback_years?: number | null
          estimated_system_size_kw?: number | null
          extracted_account_name?: string | null
          extracted_address?: string | null
          extracted_annual_kwh?: number | null
          extracted_billing_period?: string | null
          extracted_billing_period_kwh?: number | null
          extracted_day_night_meter?: boolean | null
          extracted_day_usage_kwh?: number | null
          extracted_eircode?: string | null
          extracted_estimated_reading?: boolean | null
          extracted_monthly_bill?: number | null
          extracted_mprn?: string | null
          extracted_night_rate?: number | null
          extracted_night_usage_kwh?: number | null
          extracted_notes?: string | null
          extracted_premises_type?: string | null
          extracted_provider?: string | null
          extracted_standing_charge?: number | null
          extracted_standing_charge_unit?: string | null
          extracted_tariff_name?: string | null
          extracted_unit_rate?: number | null
          extracted_vat_rate?: number | null
          extraction_confidence?: string | null
          extraction_raw?: Json | null
          finalized_25yr_savings?: number | null
          finalized_battery_model?: string | null
          finalized_inverter_model?: string | null
          finalized_net_cost?: number | null
          finalized_panel_model?: string | null
          finalized_payback_years?: number | null
          finalized_seai_grant?: number | null
          finalized_total_cost?: number | null
          id?: string
          lead_id: string
          solar_offset_pct?: number | null
          source?: string
          updated_at?: string
          year_built?: string | null
        }
        Update: {
          bill_extracted_at?: string | null
          confirmed_available_area_m2?: number | null
          confirmed_battery_kwh?: number | null
          confirmed_inverter_type?: string | null
          confirmed_panel_count?: number | null
          confirmed_roof_orientation?: string | null
          confirmed_roof_pitch?: number | null
          confirmed_roof_type?: string | null
          confirmed_shading?: string | null
          confirmed_system_size_kw?: number | null
          created_at?: string
          estimated_20yr_savings?: number | null
          estimated_annual_savings?: number | null
          estimated_payback_years?: number | null
          estimated_system_size_kw?: number | null
          extracted_account_name?: string | null
          extracted_address?: string | null
          extracted_annual_kwh?: number | null
          extracted_billing_period?: string | null
          extracted_billing_period_kwh?: number | null
          extracted_day_night_meter?: boolean | null
          extracted_day_usage_kwh?: number | null
          extracted_eircode?: string | null
          extracted_estimated_reading?: boolean | null
          extracted_monthly_bill?: number | null
          extracted_mprn?: string | null
          extracted_night_rate?: number | null
          extracted_night_usage_kwh?: number | null
          extracted_notes?: string | null
          extracted_premises_type?: string | null
          extracted_provider?: string | null
          extracted_standing_charge?: number | null
          extracted_standing_charge_unit?: string | null
          extracted_tariff_name?: string | null
          extracted_unit_rate?: number | null
          extracted_vat_rate?: number | null
          extraction_confidence?: string | null
          extraction_raw?: Json | null
          finalized_25yr_savings?: number | null
          finalized_battery_model?: string | null
          finalized_inverter_model?: string | null
          finalized_net_cost?: number | null
          finalized_panel_model?: string | null
          finalized_payback_years?: number | null
          finalized_seai_grant?: number | null
          finalized_total_cost?: number | null
          id?: string
          lead_id?: string
          solar_offset_pct?: number | null
          source?: string
          updated_at?: string
          year_built?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_intake_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_touchpoints: {
        Row: {
          actor_ref: string | null
          actor_role: string | null
          id: string
          kind: string
          lead_id: string
          occurred_at: string
          summary: string | null
        }
        Insert: {
          actor_ref?: string | null
          actor_role?: string | null
          id?: string
          kind: string
          lead_id: string
          occurred_at?: string
          summary?: string | null
        }
        Update: {
          actor_ref?: string | null
          actor_role?: string | null
          id?: string
          kind?: string
          lead_id?: string
          occurred_at?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_touchpoints_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          access_token: string | null
          address: string | null
          annual_consumption_kwh: number | null
          assigned_consultant_id: string | null
          assigned_installer_id: string | null
          brand: string | null
          county: string | null
          created_at: string
          eircode: string | null
          email: string
          id: string
          last_contacted_at: string | null
          monthly_bill: number | null
          mprn: string | null
          name: string
          notes: string | null
          origin_brand_id: string | null
          origin_domain: string | null
          origin_source_id: string | null
          owner_user_id: string | null
          phone: string | null
          property_type: string | null
          released_at: string | null
          released_by: string | null
          score: number | null
          segment: string | null
          source: string | null
          tenant_id: string | null
          updated_at: string
          workflow_stage: string | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          annual_consumption_kwh?: number | null
          assigned_consultant_id?: string | null
          assigned_installer_id?: string | null
          brand?: string | null
          county?: string | null
          created_at?: string
          eircode?: string | null
          email: string
          id?: string
          last_contacted_at?: string | null
          monthly_bill?: number | null
          mprn?: string | null
          name: string
          notes?: string | null
          origin_brand_id?: string | null
          origin_domain?: string | null
          origin_source_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          property_type?: string | null
          released_at?: string | null
          released_by?: string | null
          score?: number | null
          segment?: string | null
          source?: string | null
          tenant_id?: string | null
          updated_at?: string
          workflow_stage?: string | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          annual_consumption_kwh?: number | null
          assigned_consultant_id?: string | null
          assigned_installer_id?: string | null
          brand?: string | null
          county?: string | null
          created_at?: string
          eircode?: string | null
          email?: string
          id?: string
          last_contacted_at?: string | null
          monthly_bill?: number | null
          mprn?: string | null
          name?: string
          notes?: string | null
          origin_brand_id?: string | null
          origin_domain?: string | null
          origin_source_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          property_type?: string | null
          released_at?: string | null
          released_by?: string | null
          score?: number | null
          segment?: string | null
          source?: string | null
          tenant_id?: string | null
          updated_at?: string
          workflow_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_origin_brand_id_fkey"
            columns: ["origin_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          images: Json
          is_custom: boolean
          kind: string
          make: string
          model: string
          overrides: Json
          specs: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          images?: Json
          is_custom?: boolean
          kind: string
          make: string
          model: string
          overrides?: Json
          specs?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          images?: Json
          is_custom?: boolean
          kind?: string
          make?: string
          model?: string
          overrides?: Json
          specs?: Json
          tenant_id?: string | null
          updated_at?: string
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
          co2_saved_tonnes_per_year: number | null
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
          lifetime_savings: number | null
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
          solar_offset_pct: number | null
          special_requirements: string | null
          status: string | null
          system_cost: number | null
          system_size_kw: number | null
          updated_at: string
          yield_source: string | null
        }
        Insert: {
          approved_at?: string | null
          assigned_installer_id?: string | null
          battery_capacity_kwh?: number | null
          battery_storage?: boolean | null
          co2_saved_tonnes_per_year?: number | null
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
          lifetime_savings?: number | null
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
          solar_offset_pct?: number | null
          special_requirements?: string | null
          status?: string | null
          system_cost?: number | null
          system_size_kw?: number | null
          updated_at?: string
          yield_source?: string | null
        }
        Update: {
          approved_at?: string | null
          assigned_installer_id?: string | null
          battery_capacity_kwh?: number | null
          battery_storage?: boolean | null
          co2_saved_tonnes_per_year?: number | null
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
          lifetime_savings?: number | null
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
          solar_offset_pct?: number | null
          special_requirements?: string | null
          status?: string | null
          system_cost?: number | null
          system_size_kw?: number | null
          updated_at?: string
          yield_source?: string | null
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
      seai_grants: {
        Row: {
          data: Json
          lead_id: string
          status: string
          updated_at: string
        }
        Insert: {
          data?: Json
          lead_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lead_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seai_grants_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      site_surveys: {
        Row: {
          access_notes: string | null
          attic_access: string | null
          available_area_m2: number | null
          completed_at: string | null
          confirmed_mec_kva: number | null
          confirmed_mic_kva: number | null
          confirmed_nc7_els_assess: string | null
          confirmed_nc7_els_intend: string | null
          confirmed_nc7_mec_assess: string | null
          created_at: string
          customer_availability: string | null
          electrical_panel_capacity: string | null
          electrical_panel_condition: string | null
          estimated_installation_cost: number | null
          existing_solar: boolean | null
          grid_connection_type: string | null
          home_during_day: string | null
          household_occupants: string | null
          id: string
          installation_notes: string | null
          lead_id: string
          meter_location: string | null
          nearby_obstructions: string | null
          parking_situation: string | null
          property_storeys: number | null
          recommended_battery_kwh: number | null
          recommended_battery_model: string | null
          recommended_inverter_model: string | null
          recommended_inverter_type: string | null
          recommended_panel_count: number | null
          recommended_panel_model: string | null
          recommended_system_size: number | null
          roof_condition: string | null
          roof_material: string | null
          roof_orientation: string | null
          roof_pitch: number | null
          roof_type: string | null
          scaffolding_required: string | null
          shading_analysis: string | null
          shading_level: string | null
          special_requirements: string | null
          status: string | null
          survey_date: string | null
          surveyor_id: string
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          attic_access?: string | null
          available_area_m2?: number | null
          completed_at?: string | null
          confirmed_mec_kva?: number | null
          confirmed_mic_kva?: number | null
          confirmed_nc7_els_assess?: string | null
          confirmed_nc7_els_intend?: string | null
          confirmed_nc7_mec_assess?: string | null
          created_at?: string
          customer_availability?: string | null
          electrical_panel_capacity?: string | null
          electrical_panel_condition?: string | null
          estimated_installation_cost?: number | null
          existing_solar?: boolean | null
          grid_connection_type?: string | null
          home_during_day?: string | null
          household_occupants?: string | null
          id?: string
          installation_notes?: string | null
          lead_id: string
          meter_location?: string | null
          nearby_obstructions?: string | null
          parking_situation?: string | null
          property_storeys?: number | null
          recommended_battery_kwh?: number | null
          recommended_battery_model?: string | null
          recommended_inverter_model?: string | null
          recommended_inverter_type?: string | null
          recommended_panel_count?: number | null
          recommended_panel_model?: string | null
          recommended_system_size?: number | null
          roof_condition?: string | null
          roof_material?: string | null
          roof_orientation?: string | null
          roof_pitch?: number | null
          roof_type?: string | null
          scaffolding_required?: string | null
          shading_analysis?: string | null
          shading_level?: string | null
          special_requirements?: string | null
          status?: string | null
          survey_date?: string | null
          surveyor_id: string
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          attic_access?: string | null
          available_area_m2?: number | null
          completed_at?: string | null
          confirmed_mec_kva?: number | null
          confirmed_mic_kva?: number | null
          confirmed_nc7_els_assess?: string | null
          confirmed_nc7_els_intend?: string | null
          confirmed_nc7_mec_assess?: string | null
          created_at?: string
          customer_availability?: string | null
          electrical_panel_capacity?: string | null
          electrical_panel_condition?: string | null
          estimated_installation_cost?: number | null
          existing_solar?: boolean | null
          grid_connection_type?: string | null
          home_during_day?: string | null
          household_occupants?: string | null
          id?: string
          installation_notes?: string | null
          lead_id?: string
          meter_location?: string | null
          nearby_obstructions?: string | null
          parking_situation?: string | null
          property_storeys?: number | null
          recommended_battery_kwh?: number | null
          recommended_battery_model?: string | null
          recommended_inverter_model?: string | null
          recommended_inverter_type?: string | null
          recommended_panel_count?: number | null
          recommended_panel_model?: string | null
          recommended_system_size?: number | null
          roof_condition?: string | null
          roof_material?: string | null
          roof_orientation?: string | null
          roof_pitch?: number | null
          roof_type?: string | null
          scaffolding_required?: string | null
          shading_analysis?: string | null
          shading_level?: string | null
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
      sources: {
        Row: {
          active: boolean
          brand_id: string
          created_at: string
          domain: string | null
          id: string
          kind: string
          label: string | null
          source_key: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          brand_id: string
          created_at?: string
          domain?: string | null
          id?: string
          kind?: string
          label?: string | null
          source_key: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          brand_id?: string
          created_at?: string
          domain?: string | null
          id?: string
          kind?: string
          label?: string | null
          source_key?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      tenant_settings: {
        Row: {
          key: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          tenant_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tenants: {
        Row: {
          accent: string | null
          county: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          seats: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trading_name: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          accent?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trading_name?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trading_name?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      touchpoints: {
        Row: {
          actor: string
          agent_id: string | null
          channel: string
          created_at: string
          direction: string
          id: string
          lead_id: string
          metadata: Json | null
          stage: string
          summary: string
        }
        Insert: {
          actor: string
          agent_id?: string | null
          channel: string
          created_at?: string
          direction: string
          id?: string
          lead_id: string
          metadata?: Json | null
          stage: string
          summary: string
        }
        Update: {
          actor?: string
          agent_id?: string | null
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          stage?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymise_lead: { Args: { p_lead_id: string }; Returns: undefined }
      can_see_lead: { Args: { p_lead: string }; Returns: boolean }
      claim_next_agent_job: {
        Args: {
          p_agent_id: string
          p_lock_duration_seconds?: number
          p_worker_id: string
        }
        Returns: {
          agent_id: string
          attempts: number
          created_at: string
          failed_at: string | null
          failed_reason: string | null
          id: string
          lead_id: string | null
          locked_until: string | null
          max_attempts: number
          priority: number
          run_after: string
          trigger_data: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "agent_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_agent_job: {
        Args: { p_job_id: string; p_outputs?: Json }
        Returns: undefined
      }
      enqueue_agent: {
        Args: {
          p_agent_id: string
          p_lead_id: string
          p_priority?: number
          p_trigger_data?: Json
        }
        Returns: string
      }
      fail_agent_job: {
        Args: { p_error: string; p_job_id: string }
        Returns: undefined
      }
      grant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_email: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { p_tenant: string; p_uid: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { p_uid: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { p_tenant: string; p_uid: string }
        Returns: boolean
      }
      own_lead: { Args: { p_lead: string }; Returns: boolean }
      provision_tenant: {
        Args: { p_county?: string; p_name: string; p_trading_name?: string }
        Returns: string
      }
      resolve_lead_door: {
        Args: { p_source_key: string }
        Returns: {
          brand_id: string
          brand_name: string
          source_kind: string
          tenant_id: string
        }[]
      }
      resolve_widget_brand: {
        Args: { p_source_key: string }
        Returns: {
          domain: string
          name: string
          theme: Json
        }[]
      }
      user_is_admin: { Args: { p_uid: string }; Returns: boolean }
      utc_day: { Args: { ts: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "consultant" | "installer" | "customer" | "owner"
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
      app_role: ["admin", "consultant", "installer", "customer", "owner"],
    },
  },
} as const

