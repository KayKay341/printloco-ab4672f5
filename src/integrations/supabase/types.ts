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
      bulk_quote_requests: {
        Row: {
          budget_cents: number | null
          color_name: string | null
          created_at: string
          customer_id: string
          deadline: string | null
          details: string
          id: string
          maker_id: string
          maker_quote_cents: number | null
          maker_response: string | null
          material: string
          printer_id: string
          quantity: number
          reference_file_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_cents?: number | null
          color_name?: string | null
          created_at?: string
          customer_id: string
          deadline?: string | null
          details: string
          id?: string
          maker_id: string
          maker_quote_cents?: number | null
          maker_response?: string | null
          material: string
          printer_id: string
          quantity: number
          reference_file_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_cents?: number | null
          color_name?: string | null
          created_at?: string
          customer_id?: string
          deadline?: string | null
          details?: string
          id?: string
          maker_id?: string
          maker_quote_cents?: number | null
          maker_response?: string | null
          material?: string
          printer_id?: string
          quantity?: number
          reference_file_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          launch_date: string | null
          name: string
          signup_count: number
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          launch_date?: string | null
          name: string
          signup_count?: number
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          launch_date?: string | null
          name?: string
          signup_count?: number
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          maker_id: string
          printer_id: string | null
          stl_file_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string
          maker_id: string
          printer_id?: string | null
          stl_file_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string
          maker_id?: string
          printer_id?: string | null
          stl_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_stl_file_id_fkey"
            columns: ["stl_file_id"]
            isOneToOne: false
            referencedRelation: "stl_files"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      filament_colors: {
        Row: {
          color_name: string
          created_at: string
          hex_code: string
          id: string
          in_stock: boolean
          material: string
          printer_id: string
          surcharge_per_gram: number
        }
        Insert: {
          color_name: string
          created_at?: string
          hex_code?: string
          id?: string
          in_stock?: boolean
          material: string
          printer_id: string
          surcharge_per_gram?: number
        }
        Update: {
          color_name?: string
          created_at?: string
          hex_code?: string
          id?: string
          in_stock?: boolean
          material?: string
          printer_id?: string
          surcharge_per_gram?: number
        }
        Relationships: [
          {
            foreignKeyName: "filament_colors_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_leads: {
        Row: {
          check_size: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          organization: string | null
        }
        Insert: {
          check_size?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          organization?: string | null
        }
        Update: {
          check_size?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          organization?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_disputes: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          evidence_urls: string[]
          id: string
          maker_id: string
          order_id: string
          reason: string
          reprint_deadline: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description: string
          evidence_urls?: string[]
          id?: string
          maker_id: string
          order_id: string
          reason: string
          reprint_deadline?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          evidence_urls?: string[]
          id?: string
          maker_id?: string
          order_id?: string
          reason?: string
          reprint_deadline?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_total: number
          conversation_id: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          maker_id: string
          material: string
          notes: string | null
          pickup_code: string | null
          platform_fee: number
          printer_id: string | null
          quantity: number
          status: string
          stl_file_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_total: number
          conversation_id?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          maker_id: string
          material: string
          notes?: string | null
          pickup_code?: string | null
          platform_fee?: number
          printer_id?: string | null
          quantity?: number
          status?: string
          stl_file_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_total?: number
          conversation_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          maker_id?: string
          material?: string
          notes?: string | null
          pickup_code?: string | null
          platform_fee?: number
          printer_id?: string | null
          quantity?: number
          status?: string
          stl_file_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stl_file_id_fkey"
            columns: ["stl_file_id"]
            isOneToOne: false
            referencedRelation: "stl_files"
            referencedColumns: ["id"]
          },
        ]
      }
      print_ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          maker_id: string
          order_id: string
          printer_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          maker_id: string
          order_id: string
          printer_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          maker_id?: string
          order_id?: string
          printer_id?: string
          stars?: number
        }
        Relationships: []
      }
      printer_presets: {
        Row: {
          brand: string
          build_volume: string
          created_at: string
          id: string
          image_url: string | null
          materials: string[]
          model: string
          popularity: number
          suggested_prices: Json
        }
        Insert: {
          brand: string
          build_volume: string
          created_at?: string
          id?: string
          image_url?: string | null
          materials?: string[]
          model: string
          popularity?: number
          suggested_prices?: Json
        }
        Update: {
          brand?: string
          build_volume?: string
          created_at?: string
          id?: string
          image_url?: string | null
          materials?: string[]
          model?: string
          popularity?: number
          suggested_prices?: Json
        }
        Relationships: []
      }
      printers: {
        Row: {
          accepts_3mf: boolean
          accepts_bulk: boolean
          address: string | null
          ams_slot_count: number
          avg_rating: number
          bio: string | null
          brand: string
          build_volume: string | null
          city: string | null
          created_at: string
          has_ams: boolean
          hidden_for_inactivity: boolean
          id: string
          image_url: string | null
          is_active: boolean
          is_address_verified: boolean
          last_order_at: string | null
          latitude: number | null
          layer_height_min_mm: number
          longitude: number | null
          material_prices: Json
          material_spec_sheets: Json
          materials: string[]
          min_bulk_quantity: number
          model: string
          neighborhood: string | null
          owner_id: string
          preset_id: string | null
          price_per_gram: number
          printer_photo_url: string | null
          published: boolean
          quality_score: number
          rating_count: number
          sample_print_urls: string[]
          serial_visible: boolean
          successful_orders: number
          tier: string
          total_orders: number
          updated_at: string
          verification_status: string
          zip_code: string | null
        }
        Insert: {
          accepts_3mf?: boolean
          accepts_bulk?: boolean
          address?: string | null
          ams_slot_count?: number
          avg_rating?: number
          bio?: string | null
          brand: string
          build_volume?: string | null
          city?: string | null
          created_at?: string
          has_ams?: boolean
          hidden_for_inactivity?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_address_verified?: boolean
          last_order_at?: string | null
          latitude?: number | null
          layer_height_min_mm?: number
          longitude?: number | null
          material_prices?: Json
          material_spec_sheets?: Json
          materials?: string[]
          min_bulk_quantity?: number
          model: string
          neighborhood?: string | null
          owner_id: string
          preset_id?: string | null
          price_per_gram?: number
          printer_photo_url?: string | null
          published?: boolean
          quality_score?: number
          rating_count?: number
          sample_print_urls?: string[]
          serial_visible?: boolean
          successful_orders?: number
          tier?: string
          total_orders?: number
          updated_at?: string
          verification_status?: string
          zip_code?: string | null
        }
        Update: {
          accepts_3mf?: boolean
          accepts_bulk?: boolean
          address?: string | null
          ams_slot_count?: number
          avg_rating?: number
          bio?: string | null
          brand?: string
          build_volume?: string | null
          city?: string | null
          created_at?: string
          has_ams?: boolean
          hidden_for_inactivity?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_address_verified?: boolean
          last_order_at?: string | null
          latitude?: number | null
          layer_height_min_mm?: number
          longitude?: number | null
          material_prices?: Json
          material_spec_sheets?: Json
          materials?: string[]
          min_bulk_quantity?: number
          model?: string
          neighborhood?: string | null
          owner_id?: string
          preset_id?: string | null
          price_per_gram?: number
          printer_photo_url?: string | null
          published?: boolean
          quality_score?: number
          rating_count?: number
          sample_print_urls?: string[]
          serial_visible?: boolean
          successful_orders?: number
          tier?: string
          total_orders?: number
          updated_at?: string
          verification_status?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printers_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "printer_presets"
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
          neighborhood: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_account_id: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          neighborhood?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_account_id?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_account_id?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      stl_files: {
        Row: {
          created_at: string
          estimated_price: number | null
          estimated_weight: number | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          material: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_price?: number | null
          estimated_weight?: number | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          material?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_price?: number | null
          estimated_weight?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          material?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          notes: string | null
          referral_code: string | null
          referred_by: string | null
          role: string
          source: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          source?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          source?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      compute_quality_score: {
        Args: { _printer: Database["public"]["Tables"]["printers"]["Row"] }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_referral_stats: {
        Args: { _code: string }
        Returns: {
          city: string
          joined_at: string
          masked_email: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      user_role: "customer" | "maker"
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
      app_role: ["admin", "user"],
      user_role: ["customer", "maker"],
    },
  },
} as const
