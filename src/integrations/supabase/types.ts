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
          address: string | null
          bio: string | null
          brand: string
          build_volume: string | null
          city: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_address_verified: boolean
          latitude: number | null
          longitude: number | null
          material_prices: Json
          materials: string[]
          model: string
          neighborhood: string | null
          owner_id: string
          preset_id: string | null
          price_per_gram: number
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          brand: string
          build_volume?: string | null
          city?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_address_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          material_prices?: Json
          materials?: string[]
          model: string
          neighborhood?: string | null
          owner_id: string
          preset_id?: string | null
          price_per_gram?: number
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          brand?: string
          build_volume?: string | null
          city?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_address_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          material_prices?: Json
          materials?: string[]
          model?: string
          neighborhood?: string | null
          owner_id?: string
          preset_id?: string | null
          price_per_gram?: number
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      user_role: ["customer", "maker"],
    },
  },
} as const
