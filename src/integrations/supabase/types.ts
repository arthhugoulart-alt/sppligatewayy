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
      financial_logs: {
        Row: {
          action: string
          amount: number | null
          created_at: string
          details: Json | null
          id: string
          new_status: string | null
          payment_id: string | null
          previous_status: string | null
          producer_id: string | null
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          payment_id?: string | null
          previous_status?: string | null
          producer_id?: string | null
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          payment_id?: string | null
          previous_status?: string | null
          producer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_logs_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string
          expires_at: string | null
          id: string
          is_valid: boolean | null
          mp_user_id: string | null
          producer_id: string
          refresh_token_encrypted: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          mp_user_id?: string | null
          producer_id: string
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          mp_user_id?: string | null
          producer_id?: string
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      efi_config: {
        Row: {
          id: string
          producer_id: string
          account_identifier: string
          pix_key: string | null
          pix_key_type: string | null
          is_valid: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          producer_id: string
          account_identifier: string
          pix_key?: string | null
          pix_key_type?: string | null
          is_valid?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          producer_id?: string
          account_identifier?: string
          pix_key?: string | null
          pix_key_type?: string | null
          is_valid?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "efi_config_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_splits: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          percentage: number | null
          processed_at: string | null
          recipient_id: string | null
          recipient_type: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          percentage?: number | null
          processed_at?: string | null
          recipient_id?: string | null
          recipient_type: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          percentage?: number | null
          processed_at?: string | null
          recipient_id?: string | null
          recipient_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_splits_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          approved_at: string | null
          created_at: string
          currency: string | null
          external_reference: string
          id: string
          installments: number | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          payer_document: string | null
          payer_email: string | null
          payer_name: string | null
          payment_method: string | null
          payment_type: string | null
          platform_fee: number
          producer_amount: number
          producer_id: string | null
          product_id: string | null
          split_confirmed: boolean | null
          split_confirmed_at: string | null
          status: string | null
          status_detail: string | null
          total_amount: number
          updated_at: string
          payment_gateway: string | null
          efi_txid: string | null
          efi_e2eid: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          currency?: string | null
          external_reference: string
          id?: string
          installments?: number | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payer_document?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_method?: string | null
          payment_type?: string | null
          platform_fee: number
          producer_amount: number
          producer_id?: string | null
          product_id?: string | null
          split_confirmed?: boolean | null
          split_confirmed_at?: string | null
          status?: string | null
          status_detail?: string | null
          total_amount: number
          updated_at?: string
          payment_gateway?: string | null
          efi_txid?: string | null
          efi_e2eid?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          currency?: string | null
          external_reference?: string
          id?: string
          installments?: number | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payer_document?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_method?: string | null
          payment_type?: string | null
          platform_fee?: number
          producer_amount?: number
          producer_id?: string | null
          product_id?: string | null
          split_confirmed?: boolean | null
          split_confirmed_at?: string | null
          status?: string | null
          status_detail?: string | null
          total_amount?: number
          updated_at?: string
          payment_gateway?: string | null
          efi_txid?: string | null
          efi_e2eid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      producers: {
        Row: {
          business_name: string
          created_at: string
          document_number: string | null
          document_type: string | null
          email: string
          id: string
          mp_connected: boolean | null
          mp_user_id: string | null
          platform_fee_percentage: number | null
          status: string | null
          updated_at: string
          user_id: string | null
          efi_connected: boolean | null
          efi_account_id: string | null
          efi_pix_key: string | null
        }
        Insert: {
          business_name: string
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email: string
          id?: string
          mp_connected?: boolean | null
          mp_user_id?: string | null
          platform_fee_percentage?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          efi_connected?: boolean | null
          efi_account_id?: string | null
          efi_pix_key?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string
          id?: string
          mp_connected?: boolean | null
          mp_user_id?: string | null
          platform_fee_percentage?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          efi_connected?: boolean | null
          efi_account_id?: string | null
          efi_pix_key?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          producer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          producer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          producer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          action: string
          created_at: string
          data_id: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          raw_payload: Json
          retry_count: number | null
          signature_valid: boolean | null
        }
        Insert: {
          action: string
          created_at?: string
          data_id?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_payload: Json
          retry_count?: number | null
          signature_valid?: boolean | null
        }
        Update: {
          action?: string
          created_at?: string
          data_id?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_payload?: Json
          retry_count?: number | null
          signature_valid?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
