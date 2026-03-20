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
      project_components: {
        Row: {
          component_type: string
          created_at: string
          id: string
          project_id: string
          result_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          component_type: string
          created_at?: string
          id?: string
          project_id: string
          result_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          component_type?: string
          created_at?: string
          id?: string
          project_id?: string
          result_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          anonymous_id: string | null
          chosen_domain: string | null
          chosen_name: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          chosen_domain?: string | null
          chosen_name?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          chosen_domain?: string | null
          chosen_name?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      search_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          search_id: string
          suggested_changes: Json | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          role: string
          search_id: string
          suggested_changes?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          search_id?: string
          suggested_changes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "search_chat_messages_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_dividers: {
        Row: {
          created_at: string
          id: string
          position: number
          search_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          search_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          search_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_dividers_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_results: {
        Row: {
          batch_number: number | null
          category: string | null
          created_at: string
          domain_checks: Json | null
          exact_domain: string | null
          font_family: string | null
          gradient: string | null
          id: string
          is_chosen: boolean
          is_saved: boolean
          name: string
          position: number | null
          rationale: string | null
          search_id: string
          text_color: string | null
          variants: Json | null
        }
        Insert: {
          batch_number?: number | null
          category?: string | null
          created_at?: string
          domain_checks?: Json | null
          exact_domain?: string | null
          font_family?: string | null
          gradient?: string | null
          id?: string
          is_chosen?: boolean
          is_saved?: boolean
          name: string
          position?: number | null
          rationale?: string | null
          search_id: string
          text_color?: string | null
          variants?: Json | null
        }
        Update: {
          batch_number?: number | null
          category?: string | null
          created_at?: string
          domain_checks?: Json | null
          exact_domain?: string | null
          font_family?: string | null
          gradient?: string | null
          id?: string
          is_chosen?: boolean
          is_saved?: boolean
          name?: string
          position?: number | null
          rationale?: string | null
          search_id?: string
          text_color?: string | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "search_results_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          anonymous_id: string | null
          component_id: string | null
          config: Json
          created_at: string
          id: string
          project_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          component_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          component_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "searches_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "project_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "searches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          anonymous_id: string | null
          count: number
          created_at: string
          id: string
          metric: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          count?: number
          created_at?: string
          id?: string
          metric: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          count?: number
          created_at?: string
          id?: string
          metric?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_meta: {
        Row: {
          anonymous_id: string | null
          clerk_user_id: string | null
          created_at: string
          first_seen_at: string
          id: string
          period_end: string
          period_start: string
          selected_model: string | null
          updated_at: string
        }
        Insert: {
          anonymous_id?: string | null
          clerk_user_id?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          period_end?: string
          period_start?: string
          selected_model?: string | null
          updated_at?: string
        }
        Update: {
          anonymous_id?: string | null
          clerk_user_id?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          period_end?: string
          period_start?: string
          selected_model?: string | null
          updated_at?: string
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
