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
      drill_bits: {
        Row: {
          created_at: string
          diameter_mm: number
          id: string
          max_depth_mm: number | null
          name: string
          passante: boolean
          purpose: Database["public"]["Enums"]["drill_purpose"]
          tool_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diameter_mm: number
          id?: string
          max_depth_mm?: number | null
          name: string
          passante?: boolean
          purpose?: Database["public"]["Enums"]["drill_purpose"]
          tool_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diameter_mm?: number
          id?: string
          max_depth_mm?: number | null
          name?: string
          passante?: boolean
          purpose?: Database["public"]["Enums"]["drill_purpose"]
          tool_type?: string
          user_id?: string
        }
        Relationships: []
      }
      drilling_templates: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      edge_bands: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          price_per_meter: number | null
          thickness_mm: number
          user_id: string
          width_mm: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          price_per_meter?: number | null
          thickness_mm: number
          user_id: string
          width_mm?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          price_per_meter?: number | null
          thickness_mm?: number
          user_id?: string
          width_mm?: number | null
        }
        Relationships: []
      }
      hardware: {
        Row: {
          category: Database["public"]["Enums"]["hardware_category"]
          created_at: string
          id: string
          name: string
          params: Json
          price: number | null
          pricing_unit: Database["public"]["Enums"]["pricing_unit"]
          reference: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["hardware_category"]
          created_at?: string
          id?: string
          name: string
          params?: Json
          price?: number | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"]
          reference?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["hardware_category"]
          created_at?: string
          id?: string
          name?: string
          params?: Json
          price?: number | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"]
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          brand: string
          created_at: string
          decor_code: string | null
          has_grain: boolean
          id: string
          name: string
          price_per_sheet: number | null
          sheet_height_mm: number
          sheet_width_mm: number
          thickness_mm: number
          user_id: string
        }
        Insert: {
          brand?: string
          created_at?: string
          decor_code?: string | null
          has_grain?: boolean
          id?: string
          name: string
          price_per_sheet?: number | null
          sheet_height_mm?: number
          sheet_width_mm?: number
          thickness_mm: number
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          decor_code?: string | null
          has_grain?: boolean
          id?: string
          name?: string
          price_per_sheet?: number | null
          sheet_height_mm?: number
          sheet_width_mm?: number
          thickness_mm?: number
          user_id?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          config: Json
          created_at: string
          depth_mm: number
          height_mm: number
          id: string
          material_id: string | null
          name: string
          pieces: Json
          updated_at: string
          user_id: string
          width_mm: number
        }
        Insert: {
          config?: Json
          created_at?: string
          depth_mm?: number
          height_mm?: number
          id?: string
          material_id?: string | null
          name: string
          pieces?: Json
          updated_at?: string
          user_id: string
          width_mm?: number
        }
        Update: {
          config?: Json
          created_at?: string
          depth_mm?: number
          height_mm?: number
          id?: string
          material_id?: string | null
          name?: string
          pieces?: Json
          updated_at?: string
          user_id?: string
          width_mm?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          nif: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          nif?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          nif?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          currency: string
          default_thickness_mm: number
          id: string
          iva_percent: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          default_thickness_mm?: number
          id?: string
          iva_percent?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          default_thickness_mm?: number
          id?: string
          iva_percent?: number
          unit?: string
          updated_at?: string
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
      drill_purpose: "parafuso" | "cavilha" | "minifix" | "geral"
      hardware_category:
        | "minifix"
        | "cavilha"
        | "parafuso"
        | "dobradica"
        | "corredica"
        | "pe"
        | "perfil_aluminio"
        | "led"
        | "outro"
      pricing_unit: "unidade" | "metro"
      project_status: "rascunho" | "finalizado"
      project_type: "cozinha" | "roupeiro" | "movel"
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
      drill_purpose: ["parafuso", "cavilha", "minifix", "geral"],
      hardware_category: [
        "minifix",
        "cavilha",
        "parafuso",
        "dobradica",
        "corredica",
        "pe",
        "perfil_aluminio",
        "led",
        "outro",
      ],
      pricing_unit: ["unidade", "metro"],
      project_status: ["rascunho", "finalizado"],
      project_type: ["cozinha", "roupeiro", "movel"],
    },
  },
} as const
