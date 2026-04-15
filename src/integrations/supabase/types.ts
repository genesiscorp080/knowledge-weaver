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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          document_title: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          document_title: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          document_title?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          depth: string
          format: string
          id: string
          level: string
          pages: number | null
          table_of_contents: string | null
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          depth: string
          format: string
          id?: string
          level: string
          pages?: number | null
          table_of_contents?: string | null
          title: string
          topic: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          depth?: string
          format?: string
          id?: string
          level?: string
          pages?: number | null
          table_of_contents?: string | null
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          answers_content: string | null
          completed: boolean | null
          content: string | null
          created_at: string | null
          depth: string | null
          document_id: string
          document_title: string
          format: string | null
          id: string
          score: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers_content?: string | null
          completed?: boolean | null
          content?: string | null
          created_at?: string | null
          depth?: string | null
          document_id: string
          document_title: string
          format?: string | null
          id?: string
          score?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers_content?: string | null
          completed?: boolean | null
          content?: string | null
          created_at?: string | null
          depth?: string | null
          document_id?: string
          document_title?: string
          format?: string | null
          id?: string
          score?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      generation_queue: {
        Row: {
          created_at: string | null
          current_step: string | null
          depth: string
          document_id: string | null
          format: string
          id: string
          level: string
          pages_generated: number | null
          partial_content: string | null
          partial_toc: string | null
          progress: number | null
          reference_content: string | null
          status: string | null
          table_of_contents_input: string | null
          target_pages: number | null
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: string | null
          depth: string
          document_id?: string | null
          format: string
          id?: string
          level: string
          pages_generated?: number | null
          partial_content?: string | null
          partial_toc?: string | null
          progress?: number | null
          reference_content?: string | null
          status?: string | null
          table_of_contents_input?: string | null
          target_pages?: number | null
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: string | null
          depth?: string
          document_id?: string | null
          format?: string
          id?: string
          level?: string
          pages_generated?: number | null
          partial_content?: string | null
          partial_toc?: string | null
          progress?: number | null
          reference_content?: string | null
          status?: string | null
          table_of_contents_input?: string | null
          target_pages?: number | null
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      highlights: {
        Row: {
          color: string | null
          created_at: string | null
          document_id: string
          end_offset: number
          id: string
          page_number: number | null
          start_offset: number
          text_content: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          document_id: string
          end_offset: number
          id?: string
          page_number?: number | null
          start_offset: number
          text_content: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          document_id?: string
          end_offset?: number
          id?: string
          page_number?: number | null
          start_offset?: number
          text_content?: string
          user_id?: string
        }
        Relationships: []
      }
      imported_documents: {
        Row: {
          content: string | null
          created_at: string | null
          file_name: string
          id: string
          page_count: number | null
          theme: string | null
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_name: string
          id?: string
          page_count?: number | null
          theme?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_name?: string
          id?: string
          page_count?: number | null
          theme?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          created_at: string | null
          default_level: string | null
          email: string | null
          gender: string | null
          generations_this_week: number | null
          id: string
          is_vip: boolean | null
          last_generation_week: string | null
          last_question_date: string | null
          name: string | null
          photo_url: string | null
          questions_today: number | null
          subscription_type: string | null
          vip_expires_at: string | null
          vip_plan: string | null
        }
        Insert: {
          age_range?: string | null
          created_at?: string | null
          default_level?: string | null
          email?: string | null
          gender?: string | null
          generations_this_week?: number | null
          id: string
          is_vip?: boolean | null
          last_generation_week?: string | null
          last_question_date?: string | null
          name?: string | null
          photo_url?: string | null
          questions_today?: number | null
          subscription_type?: string | null
          vip_expires_at?: string | null
          vip_plan?: string | null
        }
        Update: {
          age_range?: string | null
          created_at?: string | null
          default_level?: string | null
          email?: string | null
          gender?: string | null
          generations_this_week?: number | null
          id?: string
          is_vip?: boolean | null
          last_generation_week?: string | null
          last_question_date?: string | null
          name?: string | null
          photo_url?: string | null
          questions_today?: number | null
          subscription_type?: string | null
          vip_expires_at?: string | null
          vip_plan?: string | null
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
