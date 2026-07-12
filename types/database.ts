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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          approver_user_id: string | null
          created_at: string
          decided_at: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          organization_id: string
          reason: string | null
          requester_user_id: string
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          approver_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          requester_user_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          approver_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          requester_user_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_role: Database["public"]["Enums"]["user_role"] | null
          actor_user_id: string | null
          changes: Json | null
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          metadata: Json
          occurred_at: string
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          actor_user_id?: string | null
          changes?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: number
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          actor_user_id?: string | null
          changes?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_pool_nominations: {
        Row: {
          active: boolean
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"] | null
          engagement_id: string
          id: string
          nominated_driver_id: string
          on_call_accepted: boolean
          on_call_accepted_at: string | null
          priority: number
          retainer_amount: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          engagement_id: string
          id?: string
          nominated_driver_id: string
          on_call_accepted?: boolean
          on_call_accepted_at?: string | null
          priority: number
          retainer_amount?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          engagement_id?: string
          id?: string
          nominated_driver_id?: string
          on_call_accepted?: boolean
          on_call_accepted_at?: string | null
          priority?: number
          retainer_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_pool_nominations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_nominated_driver_id_fkey"
            columns: ["nominated_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_nominated_driver_id_fkey"
            columns: ["nominated_driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_nominated_driver_id_fkey"
            columns: ["nominated_driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "backup_pool_nominations_nominated_driver_id_fkey"
            columns: ["nominated_driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          flagged: boolean
          id: string
          moderation_notes: string | null
          read_at: string | null
          sender_user_id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          flagged?: boolean
          id?: string
          moderation_notes?: string | null
          read_at?: string | null
          sender_user_id: string
          thread_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          flagged?: boolean
          id?: string
          moderation_notes?: string | null
          read_at?: string | null
          sender_user_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "chat_threads_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string
          id: string
          payment_id: string | null
          rate: number | null
          substitution_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string
          id?: string
          payment_id?: string | null
          rate?: number | null
          substitution_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          engagement_id?: string
          id?: string
          payment_id?: string | null
          rate?: number | null
          substitution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "commission_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_substitution_id_fkey"
            columns: ["substitution_id"]
            isOneToOne: false
            referencedRelation: "substitutions"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string
          executed_at: string | null
          id: string
          jurisdiction: string
          kind: Database["public"]["Enums"]["contract_kind"]
          pdf_sha256: string | null
          pdf_storage_path: string | null
          price_quote_hash: string
          status: Database["public"]["Enums"]["contract_status"]
          supersedes_contract_id: string | null
          terminated_at: string | null
          terminated_reason: string | null
          terms: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string
          executed_at?: string | null
          id?: string
          jurisdiction: string
          kind: Database["public"]["Enums"]["contract_kind"]
          pdf_sha256?: string | null
          pdf_storage_path?: string | null
          price_quote_hash: string
          status?: Database["public"]["Enums"]["contract_status"]
          supersedes_contract_id?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
          terms: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          engagement_id?: string
          executed_at?: string | null
          id?: string
          jurisdiction?: string
          kind?: Database["public"]["Enums"]["contract_kind"]
          pdf_sha256?: string | null
          pdf_storage_path?: string | null
          price_quote_hash?: string
          status?: Database["public"]["Enums"]["contract_status"]
          supersedes_contract_id?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
          terms?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "contracts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_supersedes_contract_id_fkey"
            columns: ["supersedes_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centres: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centres_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          default_pickup_location: unknown
          home_address: Json | null
          home_location: unknown
          id: string
          preferred_engagement_types:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          saved_locations: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_pickup_location?: unknown
          home_address?: Json | null
          home_location?: unknown
          id?: string
          preferred_engagement_types?:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          saved_locations?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_pickup_location?: unknown
          home_address?: Json | null
          home_location?: unknown
          id?: string
          preferred_engagement_types?:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          saved_locations?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_vehicles: {
        Row: {
          colour: string | null
          created_at: string
          deleted_at: string | null
          id: string
          insurance_expiry: string | null
          insurance_status: string | null
          is_default: boolean
          make: string
          model: string
          owner_organization_id: string | null
          owner_user_id: string | null
          plate_number: string | null
          transmission: string
          updated_at: string
          vehicle_class: string
          year: number | null
        }
        Insert: {
          colour?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_status?: string | null
          is_default?: boolean
          make: string
          model: string
          owner_organization_id?: string | null
          owner_user_id?: string | null
          plate_number?: string | null
          transmission: string
          updated_at?: string
          vehicle_class: string
          year?: number | null
        }
        Update: {
          colour?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_status?: string | null
          is_default?: boolean
          make?: string
          model?: string
          owner_organization_id?: string | null
          owner_user_id?: string | null
          plate_number?: string | null
          transmission?: string
          updated_at?: string
          vehicle_class?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_vehicles_owner_organization_id_fkey"
            columns: ["owner_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_vehicles_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          legal_basis: string | null
          notes: string | null
          request_type: string
          requester_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          legal_basis?: string | null
          notes?: string | null
          request_type: string
          requester_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          legal_basis?: string | null
          notes?: string | null
          request_type?: string
          requester_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          captured_at: string | null
          content_hash: string | null
          created_at: string
          dispute_id: string
          id: string
          kind: string
          metadata: Json
          reference_id: string | null
          source: Database["public"]["Enums"]["evidence_source"]
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          captured_at?: string | null
          content_hash?: string | null
          created_at?: string
          dispute_id: string
          id?: string
          kind: string
          metadata?: Json
          reference_id?: string | null
          source: Database["public"]["Enums"]["evidence_source"]
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          captured_at?: string | null
          content_hash?: string | null
          created_at?: string
          dispute_id?: string
          id?: string
          kind?: string
          metadata?: Json
          reference_id?: string | null
          source?: Database["public"]["Enums"]["evidence_source"]
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          body: string
          created_at: string
          dispute_id: string
          flagged: boolean
          id: string
          sender_role: string
          sender_user_id: string | null
          visible_to: string[]
        }
        Insert: {
          body: string
          created_at?: string
          dispute_id: string
          flagged?: boolean
          id?: string
          sender_role: string
          sender_user_id?: string | null
          visible_to?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          dispute_id?: string
          flagged?: boolean
          id?: string
          sender_role?: string
          sender_user_id?: string | null
          visible_to?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_outcomes: {
        Row: {
          amount: number | null
          applied_at: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"] | null
          dispute_id: string
          effective_from: string | null
          effective_until: string | null
          id: string
          kind: Database["public"]["Enums"]["dispute_outcome_kind"]
          notes: string | null
          target_driver_id: string | null
          target_organization_id: string | null
          target_user_id: string | null
        }
        Insert: {
          amount?: number | null
          applied_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          dispute_id: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          kind: Database["public"]["Enums"]["dispute_outcome_kind"]
          notes?: string | null
          target_driver_id?: string | null
          target_organization_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          amount?: number | null
          applied_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          dispute_id?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["dispute_outcome_kind"]
          notes?: string | null
          target_driver_id?: string | null
          target_organization_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_outcomes_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_outcomes_target_driver_id_fkey"
            columns: ["target_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_outcomes_target_driver_id_fkey"
            columns: ["target_driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "dispute_outcomes_target_driver_id_fkey"
            columns: ["target_driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "dispute_outcomes_target_driver_id_fkey"
            columns: ["target_driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "dispute_outcomes_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_outcomes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          case_number: string
          category: Database["public"]["Enums"]["dispute_category"]
          created_at: string
          engagement_id: string
          escrow_frozen: boolean
          escrow_frozen_at: string | null
          id: string
          raised_by_user_id: string
          resolution_summary: string | null
          resolved_at: string | null
          resolved_by: string | null
          respondent_notified_at: string | null
          respondent_user_id: string | null
          response_deadline: string | null
          severity: Database["public"]["Enums"]["dispute_severity"]
          status: Database["public"]["Enums"]["dispute_status"]
          summary: string | null
          triaged_at: string | null
          triaged_by: string | null
          updated_at: string
        }
        Insert: {
          case_number: string
          category: Database["public"]["Enums"]["dispute_category"]
          created_at?: string
          engagement_id: string
          escrow_frozen?: boolean
          escrow_frozen_at?: string | null
          id?: string
          raised_by_user_id: string
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          respondent_notified_at?: string | null
          respondent_user_id?: string | null
          response_deadline?: string | null
          severity?: Database["public"]["Enums"]["dispute_severity"]
          status?: Database["public"]["Enums"]["dispute_status"]
          summary?: string | null
          triaged_at?: string | null
          triaged_by?: string | null
          updated_at?: string
        }
        Update: {
          case_number?: string
          category?: Database["public"]["Enums"]["dispute_category"]
          created_at?: string
          engagement_id?: string
          escrow_frozen?: boolean
          escrow_frozen_at?: string | null
          id?: string
          raised_by_user_id?: string
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          respondent_notified_at?: string | null
          respondent_user_id?: string | null
          response_deadline?: string | null
          severity?: Database["public"]["Enums"]["dispute_severity"]
          status?: Database["public"]["Enums"]["dispute_status"]
          summary?: string | null
          triaged_at?: string | null
          triaged_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "disputes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_user_id_fkey"
            columns: ["raised_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_respondent_user_id_fkey"
            columns: ["respondent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          captured_at: string | null
          created_at: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string | null
          file_size_bytes: number | null
          id: string
          is_active: boolean
          metadata: Json
          mime_type: string | null
          owner_user_id: string
          reference_number: string | null
          sha256: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          mime_type?: string | null
          owner_user_id: string
          reference_number?: string | null
          sha256?: string | null
          storage_bucket: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          mime_type?: string | null
          owner_user_id?: string
          reference_number?: string | null
          sha256?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_availabilities: {
        Row: {
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          driver_id: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          driver_id: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          driver_id?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_availabilities_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availabilities_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_availabilities_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_availabilities_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      driver_blackouts: {
        Row: {
          created_at: string
          driver_id: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_blackouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_blackouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_blackouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_blackouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      driver_payout_methods: {
        Row: {
          account_holder_name: string
          account_number_last4: string | null
          account_number_vault_ref: string | null
          bank_code: string | null
          created_at: string
          deleted_at: string | null
          driver_id: string
          id: string
          is_default: boolean
          kyc_name_match_score: number | null
          kyc_provider_ref: string | null
          kyc_status: string
          method_type: Database["public"]["Enums"]["payout_method_type"]
          mobile_money_msisdn_vault_ref: string | null
          mobile_money_provider: string | null
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number_last4?: string | null
          account_number_vault_ref?: string | null
          bank_code?: string | null
          created_at?: string
          deleted_at?: string | null
          driver_id: string
          id?: string
          is_default?: boolean
          kyc_name_match_score?: number | null
          kyc_provider_ref?: string | null
          kyc_status?: string
          method_type: Database["public"]["Enums"]["payout_method_type"]
          mobile_money_msisdn_vault_ref?: string | null
          mobile_money_provider?: string | null
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number_last4?: string | null
          account_number_vault_ref?: string | null
          bank_code?: string | null
          created_at?: string
          deleted_at?: string | null
          driver_id?: string
          id?: string
          is_default?: boolean
          kyc_name_match_score?: number | null
          kyc_provider_ref?: string | null
          kyc_status?: string
          method_type?: Database["public"]["Enums"]["payout_method_type"]
          mobile_money_msisdn_vault_ref?: string | null
          mobile_money_provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_payout_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payout_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_payout_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_payout_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          accepts_engagement_types: Database["public"]["Enums"]["engagement_type"][]
          average_rating: number | null
          bio: string | null
          completed_jobs: number
          created_at: string
          deleted_at: string | null
          home_base_location: unknown
          id: string
          languages: string[]
          min_acceptable_tier:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          onboarding_state: Json
          onboarding_submitted_at: string | null
          reliability_score: number
          service_radius_km: number | null
          suspended: boolean
          suspended_reason: string | null
          suspended_until: string | null
          tin: string | null
          total_ratings: number
          transmission_experience: string[]
          updated_at: string
          user_id: string
          vehicle_class_experience: string[]
          verification_status: Database["public"]["Enums"]["verification_status"]
          verification_tier: Database["public"]["Enums"]["verification_tier"]
          years_experience: number
        }
        Insert: {
          accepts_engagement_types?: Database["public"]["Enums"]["engagement_type"][]
          average_rating?: number | null
          bio?: string | null
          completed_jobs?: number
          created_at?: string
          deleted_at?: string | null
          home_base_location?: unknown
          id?: string
          languages?: string[]
          min_acceptable_tier?:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          onboarding_state?: Json
          onboarding_submitted_at?: string | null
          reliability_score?: number
          service_radius_km?: number | null
          suspended?: boolean
          suspended_reason?: string | null
          suspended_until?: string | null
          tin?: string | null
          total_ratings?: number
          transmission_experience?: string[]
          updated_at?: string
          user_id: string
          vehicle_class_experience?: string[]
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verification_tier?: Database["public"]["Enums"]["verification_tier"]
          years_experience?: number
        }
        Update: {
          accepts_engagement_types?: Database["public"]["Enums"]["engagement_type"][]
          average_rating?: number | null
          bio?: string | null
          completed_jobs?: number
          created_at?: string
          deleted_at?: string | null
          home_base_location?: unknown
          id?: string
          languages?: string[]
          min_acceptable_tier?:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          onboarding_state?: Json
          onboarding_submitted_at?: string | null
          reliability_score?: number
          service_radius_km?: number | null
          suspended?: boolean
          suspended_reason?: string | null
          suspended_until?: string | null
          tin?: string | null
          total_ratings?: number
          transmission_experience?: string[]
          updated_at?: string
          user_id?: string
          vehicle_class_experience?: string[]
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verification_tier?: Database["public"]["Enums"]["verification_tier"]
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_primary: boolean
          phone: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_primary?: boolean
          phone: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_primary?: boolean
          phone?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_insurance: {
        Row: {
          created_at: string
          customer_declared_at: string
          engagement_id: string
          expiry_date: string | null
          id: string
          insurance_type: string | null
          insurer_name: string | null
          policy_number: string | null
        }
        Insert: {
          created_at?: string
          customer_declared_at?: string
          engagement_id: string
          expiry_date?: string | null
          id?: string
          insurance_type?: string | null
          insurer_name?: string | null
          policy_number?: string | null
        }
        Update: {
          created_at?: string
          customer_declared_at?: string
          engagement_id?: string
          expiry_date?: string | null
          id?: string
          insurance_type?: string | null
          insurer_name?: string | null
          policy_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_insurance_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_insurance_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "engagement_insurance_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_insurance_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_status_transitions: {
        Row: {
          engagement_id: string
          from_status: Database["public"]["Enums"]["engagement_status"] | null
          id: number
          metadata: Json
          occurred_at: string
          reason: string | null
          to_status: Database["public"]["Enums"]["engagement_status"]
          triggered_by: string | null
        }
        Insert: {
          engagement_id: string
          from_status?: Database["public"]["Enums"]["engagement_status"] | null
          id?: number
          metadata?: Json
          occurred_at?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["engagement_status"]
          triggered_by?: string | null
        }
        Update: {
          engagement_id?: string
          from_status?: Database["public"]["Enums"]["engagement_status"] | null
          id?: number
          metadata?: Json
          occurred_at?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["engagement_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_status_transitions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_status_transitions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "engagement_status_transitions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_status_transitions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_status_transitions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          accepted_at: string | null
          activated_at: string | null
          auto_substitute_policy: string
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          cancelled_reason: string | null
          commission_total: number | null
          completed_at: string | null
          confirmed_at: string | null
          contract_id: string | null
          cost_centre_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"] | null
          customer_organization_id: string | null
          customer_price_total: number | null
          customer_user_id: string | null
          deleted_at: string | null
          driver_id: string | null
          driver_payout_total: number | null
          ends_at: string | null
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          expected_daily_hours: number | null
          id: string
          min_verification_tier: Database["public"]["Enums"]["verification_tier"]
          original_driver_id: string | null
          pickup_address: Json | null
          pickup_location: unknown
          price_quote_id: string | null
          purchase_order_number: string | null
          requested_at: string | null
          requested_by_user_id: string | null
          special_instructions: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["engagement_status"]
          timezone: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          activated_at?: string | null
          auto_substitute_policy?: string
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          cancelled_reason?: string | null
          commission_total?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          cost_centre_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          customer_organization_id?: string | null
          customer_price_total?: number | null
          customer_user_id?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          driver_payout_total?: number | null
          ends_at?: string | null
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          expected_daily_hours?: number | null
          id?: string
          min_verification_tier?: Database["public"]["Enums"]["verification_tier"]
          original_driver_id?: string | null
          pickup_address?: Json | null
          pickup_location?: unknown
          price_quote_id?: string | null
          purchase_order_number?: string | null
          requested_at?: string | null
          requested_by_user_id?: string | null
          special_instructions?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          timezone?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          activated_at?: string | null
          auto_substitute_policy?: string
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          cancelled_reason?: string | null
          commission_total?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          cost_centre_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          customer_organization_id?: string | null
          customer_price_total?: number | null
          customer_user_id?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          driver_payout_total?: number | null
          ends_at?: string | null
          engagement_type?: Database["public"]["Enums"]["engagement_type"]
          expected_daily_hours?: number | null
          id?: string
          min_verification_tier?: Database["public"]["Enums"]["verification_tier"]
          original_driver_id?: string | null
          pickup_address?: Json | null
          pickup_location?: unknown
          price_quote_id?: string | null
          purchase_order_number?: string | null
          requested_at?: string | null
          requested_by_user_id?: string | null
          special_instructions?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          timezone?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagements_cancelled_by_user_id_fkey"
            columns: ["cancelled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_cost_centre_id_fkey"
            columns: ["cost_centre_id"]
            isOneToOne: false
            referencedRelation: "cost_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_customer_organization_id_fkey"
            columns: ["customer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_price_quote_id_fkey"
            columns: ["price_quote_id"]
            isOneToOne: false
            referencedRelation: "price_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "customer_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_engagements_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      favourite_drivers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourite_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "favourite_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "favourite_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "favourite_drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          description: string
          id: string
          invoice_id: string
          line_amount: number
          metadata: Json
          quantity: number
          tax_amount: number
          unit_amount: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          line_amount: number
          metadata?: Json
          quantity?: number
          tax_amount?: number
          unit_amount: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          line_amount?: number
          metadata?: Json
          quantity?: number
          tax_amount?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_organization_id: string | null
          customer_user_id: string | null
          due_date: string | null
          engagement_id: string | null
          id: string
          invoice_number: string
          issued_at: string
          paid_at: string | null
          pdf_storage_path: string | null
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_organization_id?: string | null
          customer_user_id?: string | null
          due_date?: string | null
          engagement_id?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          paid_at?: string | null
          pdf_storage_path?: string | null
          status?: string
          subtotal: number
          tax_total?: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_organization_id?: string | null
          customer_user_id?: string | null
          due_date?: string | null
          engagement_id?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          paid_at?: string | null
          pdf_storage_path?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_organization_id_fkey"
            columns: ["customer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "invoices_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          failure_reason: string | null
          id: string
          notification_id: string
          provider: string | null
          provider_ref: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          notification_id: string
          provider?: string | null
          provider_ref?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          notification_id?: string
          provider?: string | null
          provider_ref?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          category: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approval_threshold: number | null
          billing_address: Json
          billing_email: string
          country_code: string
          created_at: string
          credit_terms_days: number
          default_currency: Database["public"]["Enums"]["currency_code"]
          deleted_at: string | null
          id: string
          legal_name: string | null
          metadata: Json
          name: string
          primary_admin_id: string | null
          registration_number: string | null
          sector: string | null
          size_bracket: string | null
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
        }
        Insert: {
          approval_threshold?: number | null
          billing_address: Json
          billing_email: string
          country_code: string
          created_at?: string
          credit_terms_days?: number
          default_currency: Database["public"]["Enums"]["currency_code"]
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          metadata?: Json
          name: string
          primary_admin_id?: string | null
          registration_number?: string | null
          sector?: string | null
          size_bracket?: string | null
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Update: {
          approval_threshold?: number | null
          billing_address?: Json
          billing_email?: string
          country_code?: string
          created_at?: string
          credit_terms_days?: number
          default_currency?: Database["public"]["Enums"]["currency_code"]
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          metadata?: Json
          name?: string
          primary_admin_id?: string | null
          registration_number?: string | null
          sector?: string | null
          size_bracket?: string | null
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_primary_admin"
            columns: ["primary_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          authorized_at: string | null
          captured_at: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string
          failure_reason: string | null
          gross_amount: number
          id: string
          method_last4: string | null
          method_type: Database["public"]["Enums"]["payment_method_type"]
          net_after_provider_fee: number | null
          payer_organization_id: string | null
          payer_user_id: string | null
          provider: string
          provider_fee_amount: number | null
          provider_ref: string | null
          refunded_amount: number
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          authorized_at?: string | null
          captured_at?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string
          failure_reason?: string | null
          gross_amount: number
          id?: string
          method_last4?: string | null
          method_type: Database["public"]["Enums"]["payment_method_type"]
          net_after_provider_fee?: number | null
          payer_organization_id?: string | null
          payer_user_id?: string | null
          provider: string
          provider_fee_amount?: number | null
          provider_ref?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          authorized_at?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          engagement_id?: string
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          method_last4?: string | null
          method_type?: Database["public"]["Enums"]["payment_method_type"]
          net_after_provider_fee?: number | null
          payer_organization_id?: string | null
          payer_user_id?: string | null
          provider?: string
          provider_fee_amount?: number | null
          provider_ref?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "payments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_organization_id_fkey"
            columns: ["payer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          executed_at: string | null
          id: string
          payout_count: number
          provider: string | null
          scheduled_for: string
          status: string
          total_gross: number
          total_net: number
          total_penalties: number
          total_tax_withheld: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          executed_at?: string | null
          id?: string
          payout_count: number
          provider?: string | null
          scheduled_for: string
          status?: string
          total_gross: number
          total_net: number
          total_penalties: number
          total_tax_withheld: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          executed_at?: string | null
          id?: string
          payout_count?: number
          provider?: string | null
          scheduled_for?: string
          status?: string
          total_gross?: number
          total_net?: number
          total_penalties?: number
          total_tax_withheld?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_batches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          batch_id: string | null
          completed_at: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          driver_id: string
          engagement_id: string | null
          failed_reason: string | null
          gross_payout: number
          id: string
          initiated_at: string | null
          net_amount: number
          payout_method_id: string
          penalties_deducted: number
          provider: string | null
          provider_ref: string | null
          reversed_at: string | null
          reversed_reason: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["payout_status"]
          substitution_id: string | null
          tax_withheld_total: number
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          driver_id: string
          engagement_id?: string | null
          failed_reason?: string | null
          gross_payout: number
          id?: string
          initiated_at?: string | null
          net_amount: number
          payout_method_id: string
          penalties_deducted?: number
          provider?: string | null
          provider_ref?: string | null
          reversed_at?: string | null
          reversed_reason?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          substitution_id?: string | null
          tax_withheld_total?: number
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          driver_id?: string
          engagement_id?: string | null
          failed_reason?: string | null
          gross_payout?: number
          id?: string
          initiated_at?: string | null
          net_amount?: number
          payout_method_id?: string
          penalties_deducted?: number
          provider?: string | null
          provider_ref?: string | null
          reversed_at?: string | null
          reversed_reason?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          substitution_id?: string | null
          tax_withheld_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "payouts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "payouts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "driver_payout_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_substitution_id_fkey"
            columns: ["substitution_id"]
            isOneToOne: false
            referencedRelation: "substitutions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_quotes: {
        Row: {
          commission_total: number
          consumed_at: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_price_total: number
          driver_id: string | null
          driver_payout_total: number
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          expires_at: string
          id: string
          inputs: Json
          min_verification_tier: Database["public"]["Enums"]["verification_tier"]
          price_rule_id: string
          quote_hash: string
          rate_card_id: string
          rate_card_version: number
          requested_by_org_id: string | null
          requested_by_user_id: string
          tax_breakdown: Json
          vehicle_class: string
        }
        Insert: {
          commission_total: number
          consumed_at?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_price_total: number
          driver_id?: string | null
          driver_payout_total: number
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          expires_at: string
          id?: string
          inputs: Json
          min_verification_tier: Database["public"]["Enums"]["verification_tier"]
          price_rule_id: string
          quote_hash: string
          rate_card_id: string
          rate_card_version: number
          requested_by_org_id?: string | null
          requested_by_user_id: string
          tax_breakdown?: Json
          vehicle_class: string
        }
        Update: {
          commission_total?: number
          consumed_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_price_total?: number
          driver_id?: string | null
          driver_payout_total?: number
          engagement_type?: Database["public"]["Enums"]["engagement_type"]
          expires_at?: string
          id?: string
          inputs?: Json
          min_verification_tier?: Database["public"]["Enums"]["verification_tier"]
          price_rule_id?: string
          quote_hash?: string
          rate_card_id?: string
          rate_card_version?: number
          requested_by_org_id?: string | null
          requested_by_user_id?: string
          tax_breakdown?: Json
          vehicle_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "price_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "price_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "price_quotes_price_rule_id_fkey"
            columns: ["price_rule_id"]
            isOneToOne: false
            referencedRelation: "price_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_requested_by_org_id_fkey"
            columns: ["requested_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          base_customer_price: number
          base_driver_payout: number
          cancellation_fee_schedule: Json
          created_at: string
          day_type: string
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          id: string
          min_verification_tier: Database["public"]["Enums"]["verification_tier"]
          minimum_charge: number | null
          no_show_fee: number | null
          overtime_multiplier: number | null
          overtime_threshold_hours: number | null
          rate_card_id: string
          time_band: string
          unit: string
          updated_at: string
          vehicle_class: string
        }
        Insert: {
          base_customer_price: number
          base_driver_payout: number
          cancellation_fee_schedule?: Json
          created_at?: string
          day_type?: string
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          id?: string
          min_verification_tier: Database["public"]["Enums"]["verification_tier"]
          minimum_charge?: number | null
          no_show_fee?: number | null
          overtime_multiplier?: number | null
          overtime_threshold_hours?: number | null
          rate_card_id: string
          time_band?: string
          unit: string
          updated_at?: string
          vehicle_class: string
        }
        Update: {
          base_customer_price?: number
          base_driver_payout?: number
          cancellation_fee_schedule?: Json
          created_at?: string
          day_type?: string
          engagement_type?: Database["public"]["Enums"]["engagement_type"]
          id?: string
          min_verification_tier?: Database["public"]["Enums"]["verification_tier"]
          minimum_charge?: number | null
          no_show_fee?: number | null
          overtime_multiplier?: number | null
          overtime_threshold_hours?: number | null
          rate_card_id?: string
          time_band?: string
          unit?: string
          updated_at?: string
          vehicle_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          country_code: string
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          effective_from: string | null
          effective_until: string | null
          id: string
          name: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          retired_at: string | null
          retired_by: string | null
          status: Database["public"]["Enums"]["rate_card_status"]
          updated_at: string
          version: number
        }
        Insert: {
          country_code: string
          created_at?: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          name: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          retired_at?: string | null
          retired_by?: string | null
          status?: Database["public"]["Enums"]["rate_card_status"]
          updated_at?: string
          version: number
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          name?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          retired_at?: string | null
          retired_by?: string | null
          status?: Database["public"]["Enums"]["rate_card_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_retired_by_fkey"
            columns: ["retired_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          engagement_id: string
          id: string
          quarantine_reason: string | null
          quarantined: boolean
          rated_driver_id: string | null
          rated_kind: Database["public"]["Enums"]["rating_target"]
          rated_user_id: string | null
          rater_user_id: string
          stars: number
          substitution_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          quarantine_reason?: string | null
          quarantined?: boolean
          rated_driver_id?: string | null
          rated_kind: Database["public"]["Enums"]["rating_target"]
          rated_user_id?: string | null
          rater_user_id: string
          stars: number
          substitution_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          quarantine_reason?: string | null
          quarantined?: boolean
          rated_driver_id?: string | null
          rated_kind?: Database["public"]["Enums"]["rating_target"]
          rated_user_id?: string | null
          rater_user_id?: string
          stars?: number
          substitution_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "ratings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_driver_id_fkey"
            columns: ["rated_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_driver_id_fkey"
            columns: ["rated_driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ratings_rated_driver_id_fkey"
            columns: ["rated_driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ratings_rated_driver_id_fkey"
            columns: ["rated_driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_substitution_id_fkey"
            columns: ["substitution_id"]
            isOneToOne: false
            referencedRelation: "substitutions"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_roles: {
        Row: {
          compensation_currency:
            | Database["public"]["Enums"]["currency_code"]
            | null
          compensation_monthly: number | null
          created_at: string
          description: string
          filled_engagement_id: string | null
          id: string
          location: unknown
          min_verification_tier: Database["public"]["Enums"]["verification_tier"]
          posted_by_organization_id: string | null
          posted_by_user_id: string | null
          required_languages: string[] | null
          required_vehicle_class: string[] | null
          rest_days: Database["public"]["Enums"]["day_of_week"][] | null
          standing_duties: string[] | null
          status: string
          title: string
          updated_at: string
          weekly_hours: number | null
          work_days: Database["public"]["Enums"]["day_of_week"][] | null
        }
        Insert: {
          compensation_currency?:
            | Database["public"]["Enums"]["currency_code"]
            | null
          compensation_monthly?: number | null
          created_at?: string
          description: string
          filled_engagement_id?: string | null
          id?: string
          location?: unknown
          min_verification_tier?: Database["public"]["Enums"]["verification_tier"]
          posted_by_organization_id?: string | null
          posted_by_user_id?: string | null
          required_languages?: string[] | null
          required_vehicle_class?: string[] | null
          rest_days?: Database["public"]["Enums"]["day_of_week"][] | null
          standing_duties?: string[] | null
          status?: string
          title: string
          updated_at?: string
          weekly_hours?: number | null
          work_days?: Database["public"]["Enums"]["day_of_week"][] | null
        }
        Update: {
          compensation_currency?:
            | Database["public"]["Enums"]["currency_code"]
            | null
          compensation_monthly?: number | null
          created_at?: string
          description?: string
          filled_engagement_id?: string | null
          id?: string
          location?: unknown
          min_verification_tier?: Database["public"]["Enums"]["verification_tier"]
          posted_by_organization_id?: string | null
          posted_by_user_id?: string | null
          required_languages?: string[] | null
          required_vehicle_class?: string[] | null
          rest_days?: Database["public"]["Enums"]["day_of_week"][] | null
          standing_duties?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          weekly_hours?: number | null
          work_days?: Database["public"]["Enums"]["day_of_week"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_roles_filled_engagement_id_fkey"
            columns: ["filled_engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_roles_filled_engagement_id_fkey"
            columns: ["filled_engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "recruitment_roles_filled_engagement_id_fkey"
            columns: ["filled_engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_roles_filled_engagement_id_fkey"
            columns: ["filled_engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_roles_posted_by_organization_id_fkey"
            columns: ["posted_by_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_roles_posted_by_user_id_fkey"
            columns: ["posted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_shortlist_entries: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          interview_scheduled_at: string | null
          match_reasons: Json | null
          match_score: number | null
          notes: string | null
          role_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          interview_scheduled_at?: string | null
          match_reasons?: Json | null
          match_score?: number | null
          notes?: string | null
          role_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          interview_scheduled_at?: string | null
          match_reasons?: Json | null
          match_score?: number | null
          notes?: string | null
          role_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_shortlist_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_shortlist_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "recruitment_shortlist_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "recruitment_shortlist_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "recruitment_shortlist_entries_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "recruitment_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          dispute_id: string | null
          id: string
          payment_id: string
          processed_at: string | null
          provider_ref: string | null
          reason: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          dispute_id?: string | null
          id?: string
          payment_id: string
          processed_at?: string | null
          provider_ref?: string | null
          reason: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          dispute_id?: string | null
          id?: string
          payment_id?: string
          processed_at?: string | null
          provider_ref?: string | null
          reason?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          engagement_id: string | null
          event_type: string
          id: string
          location: unknown
          metadata: Json
          resolution_notes: string | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          engagement_id?: string | null
          event_type: string
          id?: string
          location?: unknown
          metadata?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          engagement_id?: string | null
          event_type?: string
          id?: string
          location?: unknown
          metadata?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_events_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "safety_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          contract_id: string
          id: string
          ip_address: unknown
          signatory_id: string
          signatory_role: Database["public"]["Enums"]["signature_role"]
          signature_ref: string
          signature_type: string
          signed_at: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          id?: string
          ip_address?: unknown
          signatory_id: string
          signatory_role: Database["public"]["Enums"]["signature_role"]
          signature_ref: string
          signature_type?: string
          signed_at?: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          id?: string
          ip_address?: unknown
          signatory_id?: string
          signatory_role?: Database["public"]["Enums"]["signature_role"]
          signature_ref?: string
          signature_type?: string
          signed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_signatory_id_fkey"
            columns: ["signatory_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      substitutions: {
        Row: {
          addendum_contract_id: string | null
          created_at: string
          customer_approval_required: boolean
          customer_approved_at: string | null
          customer_approved_by: string | null
          engagement_id: string
          handover_briefing_ref: string | null
          id: string
          interval_ends_at: string
          interval_starts_at: string
          justification_verified: boolean
          original_driver_id: string
          original_driver_penalty_amount: number
          proposed_candidates: Json
          reason: Database["public"]["Enums"]["substitution_reason"] | null
          reason_details: string | null
          status: Database["public"]["Enums"]["substitution_status"]
          substitute_accepted_at: string | null
          substitute_driver_id: string | null
          trigger: Database["public"]["Enums"]["substitution_trigger"]
          updated_at: string
        }
        Insert: {
          addendum_contract_id?: string | null
          created_at?: string
          customer_approval_required: boolean
          customer_approved_at?: string | null
          customer_approved_by?: string | null
          engagement_id: string
          handover_briefing_ref?: string | null
          id?: string
          interval_ends_at: string
          interval_starts_at: string
          justification_verified?: boolean
          original_driver_id: string
          original_driver_penalty_amount?: number
          proposed_candidates?: Json
          reason?: Database["public"]["Enums"]["substitution_reason"] | null
          reason_details?: string | null
          status?: Database["public"]["Enums"]["substitution_status"]
          substitute_accepted_at?: string | null
          substitute_driver_id?: string | null
          trigger: Database["public"]["Enums"]["substitution_trigger"]
          updated_at?: string
        }
        Update: {
          addendum_contract_id?: string | null
          created_at?: string
          customer_approval_required?: boolean
          customer_approved_at?: string | null
          customer_approved_by?: string | null
          engagement_id?: string
          handover_briefing_ref?: string | null
          id?: string
          interval_ends_at?: string
          interval_starts_at?: string
          justification_verified?: boolean
          original_driver_id?: string
          original_driver_penalty_amount?: number
          proposed_candidates?: Json
          reason?: Database["public"]["Enums"]["substitution_reason"] | null
          reason_details?: string | null
          status?: Database["public"]["Enums"]["substitution_status"]
          substitute_accepted_at?: string | null
          substitute_driver_id?: string | null
          trigger?: Database["public"]["Enums"]["substitution_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitutions_addendum_contract_id_fkey"
            columns: ["addendum_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_customer_approved_by_fkey"
            columns: ["customer_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "substitutions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "substitutions_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "substitutions_original_driver_id_fkey"
            columns: ["original_driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "substitutions_substitute_driver_id_fkey"
            columns: ["substitute_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_substitute_driver_id_fkey"
            columns: ["substitute_driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "substitutions_substitute_driver_id_fkey"
            columns: ["substitute_driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "substitutions_substitute_driver_id_fkey"
            columns: ["substitute_driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          internal_note: boolean
          sender_user_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          internal_note?: boolean
          sender_user_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          internal_note?: boolean
          sender_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          dispute_id: string | null
          engagement_id: string | null
          id: string
          organization_id: string | null
          priority: string
          reporter_user_id: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description?: string | null
          dispute_id?: string | null
          engagement_id?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          reporter_user_id: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          dispute_id?: string | null
          engagement_id?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          reporter_user_id?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "support_tickets_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_entries: {
        Row: {
          amount: number
          applies_to: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id: string | null
          id: string
          jurisdiction: string
          payment_id: string | null
          payout_id: string | null
          rate: number | null
          remittance_batch: string | null
          remitted_at: string | null
          tax_rule_id: string | null
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_base: number
        }
        Insert: {
          amount: number
          applies_to: string
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          engagement_id?: string | null
          id?: string
          jurisdiction: string
          payment_id?: string | null
          payout_id?: string | null
          rate?: number | null
          remittance_batch?: string | null
          remitted_at?: string | null
          tax_rule_id?: string | null
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_base: number
        }
        Update: {
          amount?: number
          applies_to?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          engagement_id?: string | null
          id?: string
          jurisdiction?: string
          payment_id?: string | null
          payout_id?: string | null
          rate?: number | null
          remittance_batch?: string | null
          remitted_at?: string | null
          tax_rule_id?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"]
          taxable_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "tax_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entries_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entries_tax_rule_id_fkey"
            columns: ["tax_rule_id"]
            isOneToOne: false
            referencedRelation: "tax_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules: {
        Row: {
          applies_to: string
          applies_when_engagement:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          authority_name: string | null
          country_code: string
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          effective_from: string
          effective_until: string | null
          fixed_amount: number | null
          id: string
          published_at: string | null
          published_by: string | null
          rate: number
          remittance_frequency: string | null
          status: Database["public"]["Enums"]["rate_card_status"]
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string
        }
        Insert: {
          applies_to: string
          applies_when_engagement?:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          authority_name?: string | null
          country_code: string
          created_at?: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          effective_from: string
          effective_until?: string | null
          fixed_amount?: number | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          rate: number
          remittance_frequency?: string | null
          status?: Database["public"]["Enums"]["rate_card_status"]
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
        }
        Update: {
          applies_to?: string
          applies_when_engagement?:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          authority_name?: string | null
          country_code?: string
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          effective_from?: string
          effective_until?: string | null
          fixed_amount?: number | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          rate?: number
          remittance_frequency?: string | null
          status?: Database["public"]["Enums"]["rate_card_status"]
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rules_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          app_version: string | null
          device_id: string
          first_seen_at: string
          id: string
          last_seen_at: string | null
          platform: string
          platform_version: string | null
          push_provider: string | null
          push_token: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          device_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string | null
          platform: string
          platform_version?: string | null
          push_provider?: string | null
          push_token?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          device_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string | null
          platform?: string
          platform_version?: string | null
          push_provider?: string | null
          push_token?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          mfa_required: boolean
          organization_id: string | null
          permission_overrides: Json
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          mfa_required?: boolean
          organization_id?: string | null
          permission_overrides?: Json
          revoked_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          mfa_required?: boolean
          organization_id?: string | null
          permission_overrides?: Json
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"] | null
          country_code: string
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          display_name: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          preferred_currency:
            | Database["public"]["Enums"]["currency_code"]
            | null
          preferred_language: string
          sessions_revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role"] | null
          country_code: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id: string
          phone?: string | null
          preferred_currency?:
            | Database["public"]["Enums"]["currency_code"]
            | null
          preferred_language?: string
          sessions_revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"] | null
          country_code?: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          preferred_currency?:
            | Database["public"]["Enums"]["currency_code"]
            | null
          preferred_language?: string
          sessions_revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      verification_events: {
        Row: {
          automated_check: string | null
          automated_result: Json | null
          created_at: string
          driver_id: string
          event_type: Database["public"]["Enums"]["verification_event_type"]
          from_status: Database["public"]["Enums"]["verification_status"] | null
          from_tier: Database["public"]["Enums"]["verification_tier"] | null
          id: number
          rationale: string | null
          requested_docs: string[] | null
          reviewer_user_id: string | null
          to_status: Database["public"]["Enums"]["verification_status"] | null
          to_tier: Database["public"]["Enums"]["verification_tier"] | null
        }
        Insert: {
          automated_check?: string | null
          automated_result?: Json | null
          created_at?: string
          driver_id: string
          event_type: Database["public"]["Enums"]["verification_event_type"]
          from_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          from_tier?: Database["public"]["Enums"]["verification_tier"] | null
          id?: number
          rationale?: string | null
          requested_docs?: string[] | null
          reviewer_user_id?: string | null
          to_status?: Database["public"]["Enums"]["verification_status"] | null
          to_tier?: Database["public"]["Enums"]["verification_tier"] | null
        }
        Update: {
          automated_check?: string | null
          automated_result?: Json | null
          created_at?: string
          driver_id?: string
          event_type?: Database["public"]["Enums"]["verification_event_type"]
          from_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          from_tier?: Database["public"]["Enums"]["verification_tier"] | null
          id?: number
          rationale?: string | null
          requested_docs?: string[] | null
          reviewer_user_id?: string | null
          to_status?: Database["public"]["Enums"]["verification_status"] | null
          to_tier?: Database["public"]["Enums"]["verification_tier"] | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "verification_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "verification_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "verification_events_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          breaks: Json
          check_in_at: string | null
          check_in_code: string | null
          check_out_at: string | null
          created_at: string
          customer_confirmed_at: string | null
          driver_confirmed_at: string | null
          driver_id: string
          engagement_id: string
          gps_trail_ref: string | null
          id: string
          notes: string | null
          overtime_hours: number
          session_date: string
          updated_at: string
        }
        Insert: {
          breaks?: Json
          check_in_at?: string | null
          check_in_code?: string | null
          check_out_at?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          driver_confirmed_at?: string | null
          driver_id: string
          engagement_id: string
          gps_trail_ref?: string | null
          id?: string
          notes?: string | null
          overtime_hours?: number
          session_date: string
          updated_at?: string
        }
        Update: {
          breaks?: Json
          check_in_at?: string | null
          check_in_code?: string | null
          check_out_at?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          driver_confirmed_at?: string | null
          driver_id?: string
          engagement_id?: string
          gps_trail_ref?: string | null
          id?: string
          notes?: string | null
          overtime_hours?: number
          session_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "work_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "work_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "work_sessions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagement_reconciliation"
            referencedColumns: ["engagement_id"]
          },
          {
            foreignKeyName: "work_sessions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_engagements_driver"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      v_driver_earnings_monthly: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"] | null
          driver_id: string | null
          gross_total: number | null
          month: string | null
          net_total: number | null
          payouts_count: number | null
          penalties_deducted_total: number | null
          tax_withheld_total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_engagement_reconciliation: {
        Row: {
          captured_total: number | null
          commission_recognised: number | null
          commission_total: number | null
          completed_at: string | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          customer_price_total: number | null
          driver_payout_total: number | null
          engagement_id: string | null
          fully_reconciled: boolean | null
          payout_completed_total: number | null
          refunded_total: number | null
          status: Database["public"]["Enums"]["engagement_status"] | null
          tax_recognised: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_engagements_customer: {
        Row: {
          activated_at: string | null
          auto_substitute_policy: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          contract_id: string | null
          cost_centre_id: string | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          customer_organization_id: string | null
          customer_price_total: number | null
          customer_user_id: string | null
          driver_id: string | null
          driver_name: string | null
          driver_rating: number | null
          driver_user_id: string | null
          driver_verification_tier:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          ends_at: string | null
          engagement_type: Database["public"]["Enums"]["engagement_type"] | null
          expected_daily_hours: number | null
          id: string | null
          min_verification_tier:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          pickup_address: Json | null
          pickup_location: unknown
          price_quote_id: string | null
          requested_at: string | null
          special_instructions: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["engagement_status"] | null
          timezone: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_cost_centre_id_fkey"
            columns: ["cost_centre_id"]
            isOneToOne: false
            referencedRelation: "cost_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_customer_organization_id_fkey"
            columns: ["customer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_price_quote_id_fkey"
            columns: ["price_quote_id"]
            isOneToOne: false
            referencedRelation: "price_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "customer_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_engagements_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_engagements_driver: {
        Row: {
          accepted_at: string | null
          activated_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          contract_id: string | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          customer_name: string | null
          customer_organization_id: string | null
          customer_user_id: string | null
          driver_id: string | null
          driver_payout_total: number | null
          ends_at: string | null
          engagement_type: Database["public"]["Enums"]["engagement_type"] | null
          expected_daily_hours: number | null
          id: string | null
          min_verification_tier:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          pickup_address: Json | null
          pickup_location: unknown
          requested_at: string | null
          special_instructions: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["engagement_status"] | null
          timezone: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagements_customer_organization_id_fkey"
            columns: ["customer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_driver_earnings_monthly"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_public_driver_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_verification_queue"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "engagements_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "customer_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_engagements_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_public_driver_summary: {
        Row: {
          accepts_engagement_types:
            | Database["public"]["Enums"]["engagement_type"][]
            | null
          average_rating: number | null
          bio: string | null
          completed_jobs: number | null
          driver_id: string | null
          full_name: string | null
          home_base_location: unknown
          languages: string[] | null
          service_radius_km: number | null
          total_ratings: number | null
          transmission_experience: string[] | null
          user_id: string | null
          vehicle_class_experience: string[] | null
          verification_tier:
            | Database["public"]["Enums"]["verification_tier"]
            | null
          years_experience: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_verification_queue: {
        Row: {
          active_document_count: number | null
          country_code: string | null
          driver_id: string | null
          full_name: string | null
          phone: string | null
          submitted_at: string | null
          time_waiting: string | null
          user_id: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_tier:
            | Database["public"]["Enums"]["verification_tier"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      auth_aal: { Args: never; Returns: string }
      auth_active_org_id: { Args: never; Returns: string }
      auth_is_admin: { Args: never; Returns: boolean }
      auth_role_has: { Args: { needle: string }; Returns: boolean }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fn_rebuild_user_claims: {
        Args: { target_user: string }
        Returns: undefined
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected" | "expired"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "soft_delete"
        | "approve"
        | "reject"
        | "request_more_info"
        | "publish"
        | "retire"
        | "sign"
        | "submit"
        | "cancel"
        | "withdraw"
        | "authorize"
        | "capture"
        | "refund"
        | "initiate_payout"
        | "complete_payout"
        | "fail_payout"
        | "reverse_payout"
        | "access"
        | "export"
      contract_kind:
        | "engagement_short"
        | "engagement_standard"
        | "engagement_heavy"
        | "employment_permanent"
        | "substitution_addendum"
      contract_status:
        | "draft"
        | "pending_signatures"
        | "executed"
        | "superseded"
        | "terminated"
      currency_code: "NGN" | "GHS" | "KES" | "ZAR" | "USD" | "EUR" | "GBP"
      day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
      dispute_category:
        | "no_show"
        | "late_arrival"
        | "service_quality"
        | "overtime_disagreement"
        | "vehicle_damage"
        | "financial"
        | "contract_breach"
        | "safety_incident"
        | "misconduct"
        | "fraud"
      dispute_outcome_kind:
        | "full_refund"
        | "partial_refund"
        | "credit_apology"
        | "re_invoice"
        | "no_action"
        | "driver_warning"
        | "driver_suspension"
        | "driver_ban"
        | "customer_warning"
        | "customer_suspension"
        | "customer_ban"
        | "insurance_claim_opened"
        | "legal_escalation"
      dispute_severity: "low" | "medium" | "high" | "critical"
      dispute_status:
        | "raised"
        | "triaged"
        | "awaiting_respondent"
        | "under_review"
        | "mediation"
        | "escalated"
        | "resolved_by_agreement"
        | "resolved_by_decision"
        | "withdrawn"
      document_type:
        | "driver_licence_front"
        | "driver_licence_back"
        | "national_id"
        | "passport"
        | "voter_card"
        | "utility_bill"
        | "bank_statement"
        | "selfie"
        | "vehicle_insurance"
        | "medical_note"
        | "reference_letter"
        | "background_check_result"
        | "other"
      engagement_status:
        | "draft"
        | "requested"
        | "accepted"
        | "declined"
        | "expired"
        | "contract_pending"
        | "confirmed"
        | "active"
        | "reassigning_pre"
        | "reassigning_mid"
        | "completed"
        | "cancelled"
        | "disputed"
        | "partially_resolved"
        | "refunded"
      engagement_type:
        | "immediate"
        | "hourly"
        | "half_day"
        | "full_day"
        | "multi_day"
        | "weekly"
        | "monthly"
        | "permanent"
      evidence_source: "user_uploaded" | "system_captured" | "third_party"
      notification_channel: "email" | "sms" | "push" | "in_app"
      notification_status: "pending" | "sent" | "delivered" | "failed" | "read"
      organization_status:
        | "pending_verification"
        | "active"
        | "suspended"
        | "closed"
      payment_method_type: "card" | "bank_transfer" | "mobile_money" | "wallet"
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "partially_refunded"
        | "refunded"
        | "failed"
        | "held"
      payout_method_type: "bank_account" | "mobile_money"
      payout_status:
        | "pending"
        | "batched"
        | "initiated"
        | "completed"
        | "failed"
        | "reversed"
        | "held"
      rate_card_status: "draft" | "published" | "retired"
      rating_target: "driver" | "customer"
      signature_role:
        | "customer"
        | "driver"
        | "corporate_admin"
        | "avanti_witness"
      substitution_reason:
        | "illness"
        | "family_emergency"
        | "vehicle_issue"
        | "safety_concern"
        | "schedule_conflict"
        | "admin_forced"
        | "other"
      substitution_status:
        | "proposed"
        | "awaiting_customer_approval"
        | "awaiting_substitute_acceptance"
        | "active"
        | "completed"
        | "declined"
        | "cancelled"
      substitution_trigger:
        | "driver_cancelled"
        | "driver_no_show"
        | "driver_unavailable_mid"
        | "verification_lapsed"
        | "admin_suspended"
        | "rating_threshold"
        | "customer_requested"
      tax_type:
        | "wht"
        | "vat"
        | "paye"
        | "pension"
        | "statutory_contribution"
        | "other"
      user_role:
        | "individual_customer"
        | "driver"
        | "corporate_admin"
        | "corporate_member"
        | "admin_verifier"
        | "admin_support"
        | "admin_finance"
        | "admin_compliance"
        | "super_admin"
      verification_event_type:
        | "submitted"
        | "reviewer_assigned"
        | "approved"
        | "rejected"
        | "more_info_requested"
        | "auto_check_passed"
        | "auto_check_failed"
        | "tier_changed"
      verification_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "under_review"
        | "more_info_needed"
        | "approved"
        | "rejected"
      verification_tier: "t0" | "t1" | "t2" | "t3" | "t4"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      approval_status: ["pending", "approved", "rejected", "expired"],
      audit_action: [
        "create",
        "update",
        "delete",
        "soft_delete",
        "approve",
        "reject",
        "request_more_info",
        "publish",
        "retire",
        "sign",
        "submit",
        "cancel",
        "withdraw",
        "authorize",
        "capture",
        "refund",
        "initiate_payout",
        "complete_payout",
        "fail_payout",
        "reverse_payout",
        "access",
        "export",
      ],
      contract_kind: [
        "engagement_short",
        "engagement_standard",
        "engagement_heavy",
        "employment_permanent",
        "substitution_addendum",
      ],
      contract_status: [
        "draft",
        "pending_signatures",
        "executed",
        "superseded",
        "terminated",
      ],
      currency_code: ["NGN", "GHS", "KES", "ZAR", "USD", "EUR", "GBP"],
      day_of_week: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      dispute_category: [
        "no_show",
        "late_arrival",
        "service_quality",
        "overtime_disagreement",
        "vehicle_damage",
        "financial",
        "contract_breach",
        "safety_incident",
        "misconduct",
        "fraud",
      ],
      dispute_outcome_kind: [
        "full_refund",
        "partial_refund",
        "credit_apology",
        "re_invoice",
        "no_action",
        "driver_warning",
        "driver_suspension",
        "driver_ban",
        "customer_warning",
        "customer_suspension",
        "customer_ban",
        "insurance_claim_opened",
        "legal_escalation",
      ],
      dispute_severity: ["low", "medium", "high", "critical"],
      dispute_status: [
        "raised",
        "triaged",
        "awaiting_respondent",
        "under_review",
        "mediation",
        "escalated",
        "resolved_by_agreement",
        "resolved_by_decision",
        "withdrawn",
      ],
      document_type: [
        "driver_licence_front",
        "driver_licence_back",
        "national_id",
        "passport",
        "voter_card",
        "utility_bill",
        "bank_statement",
        "selfie",
        "vehicle_insurance",
        "medical_note",
        "reference_letter",
        "background_check_result",
        "other",
      ],
      engagement_status: [
        "draft",
        "requested",
        "accepted",
        "declined",
        "expired",
        "contract_pending",
        "confirmed",
        "active",
        "reassigning_pre",
        "reassigning_mid",
        "completed",
        "cancelled",
        "disputed",
        "partially_resolved",
        "refunded",
      ],
      engagement_type: [
        "immediate",
        "hourly",
        "half_day",
        "full_day",
        "multi_day",
        "weekly",
        "monthly",
        "permanent",
      ],
      evidence_source: ["user_uploaded", "system_captured", "third_party"],
      notification_channel: ["email", "sms", "push", "in_app"],
      notification_status: ["pending", "sent", "delivered", "failed", "read"],
      organization_status: [
        "pending_verification",
        "active",
        "suspended",
        "closed",
      ],
      payment_method_type: ["card", "bank_transfer", "mobile_money", "wallet"],
      payment_status: [
        "pending",
        "authorized",
        "captured",
        "partially_refunded",
        "refunded",
        "failed",
        "held",
      ],
      payout_method_type: ["bank_account", "mobile_money"],
      payout_status: [
        "pending",
        "batched",
        "initiated",
        "completed",
        "failed",
        "reversed",
        "held",
      ],
      rate_card_status: ["draft", "published", "retired"],
      rating_target: ["driver", "customer"],
      signature_role: [
        "customer",
        "driver",
        "corporate_admin",
        "avanti_witness",
      ],
      substitution_reason: [
        "illness",
        "family_emergency",
        "vehicle_issue",
        "safety_concern",
        "schedule_conflict",
        "admin_forced",
        "other",
      ],
      substitution_status: [
        "proposed",
        "awaiting_customer_approval",
        "awaiting_substitute_acceptance",
        "active",
        "completed",
        "declined",
        "cancelled",
      ],
      substitution_trigger: [
        "driver_cancelled",
        "driver_no_show",
        "driver_unavailable_mid",
        "verification_lapsed",
        "admin_suspended",
        "rating_threshold",
        "customer_requested",
      ],
      tax_type: [
        "wht",
        "vat",
        "paye",
        "pension",
        "statutory_contribution",
        "other",
      ],
      user_role: [
        "individual_customer",
        "driver",
        "corporate_admin",
        "corporate_member",
        "admin_verifier",
        "admin_support",
        "admin_finance",
        "admin_compliance",
        "super_admin",
      ],
      verification_event_type: [
        "submitted",
        "reviewer_assigned",
        "approved",
        "rejected",
        "more_info_requested",
        "auto_check_passed",
        "auto_check_failed",
        "tier_changed",
      ],
      verification_status: [
        "not_started",
        "in_progress",
        "submitted",
        "under_review",
        "more_info_needed",
        "approved",
        "rejected",
      ],
      verification_tier: ["t0", "t1", "t2", "t3", "t4"],
    },
  },
} as const
