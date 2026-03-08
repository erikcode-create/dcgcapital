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
      deal_assignments: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          investor_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          investor_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          investor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_documents: {
        Row: {
          content_type: string | null
          created_at: string
          deal_id: string
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          source: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          deal_id: string
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          deal_id?: string
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deal_id: string
          id: string
          note_type: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deal_id: string
          id?: string
          note_type?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          deal_type: string | null
          description: string | null
          ebitda: number | null
          enterprise_value: number | null
          geography: string | null
          id: string
          investment_amount: number | null
          name: string
          notes: string | null
          pitch_deck_path: string | null
          revenue: number | null
          sector: string | null
          source_email_id: string | null
          stage: string
          status: string
          target_return: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deal_type?: string | null
          description?: string | null
          ebitda?: number | null
          enterprise_value?: number | null
          geography?: string | null
          id?: string
          investment_amount?: number | null
          name: string
          notes?: string | null
          pitch_deck_path?: string | null
          revenue?: number | null
          sector?: string | null
          source_email_id?: string | null
          stage?: string
          status?: string
          target_return?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deal_type?: string | null
          description?: string | null
          ebitda?: number | null
          enterprise_value?: number | null
          geography?: string | null
          id?: string
          investment_amount?: number | null
          name?: string
          notes?: string | null
          pitch_deck_path?: string | null
          revenue?: number | null
          sector?: string | null
          source_email_id?: string | null
          stage?: string
          status?: string
          target_return?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body_html: string | null
          body_preview: string | null
          body_text: string | null
          category: string | null
          cc_addresses: Json | null
          conversation_id: string | null
          created_at: string
          folder: string | null
          from_address: string | null
          from_name: string | null
          has_attachments: boolean | null
          id: string
          importance: string | null
          in_reply_to: string | null
          is_draft: boolean | null
          is_read: boolean | null
          microsoft_id: string
          received_at: string | null
          sent_at: string | null
          subject: string | null
          to_addresses: Json | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_preview?: string | null
          body_text?: string | null
          category?: string | null
          cc_addresses?: Json | null
          conversation_id?: string | null
          created_at?: string
          folder?: string | null
          from_address?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          importance?: string | null
          in_reply_to?: string | null
          is_draft?: boolean | null
          is_read?: boolean | null
          microsoft_id: string
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          to_addresses?: Json | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_preview?: string | null
          body_text?: string | null
          category?: string | null
          cc_addresses?: Json | null
          conversation_id?: string | null
          created_at?: string
          folder?: string | null
          from_address?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          importance?: string | null
          in_reply_to?: string | null
          is_draft?: boolean | null
          is_read?: boolean | null
          microsoft_id?: string
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          to_addresses?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      interest_expressions: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          investor_id: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          investor_id: string
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          investor_id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interest_expressions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      nda_signatures: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          ip_address: string | null
          nda_template_id: string
          signature_date: string
          signature_name: string
          signed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          ip_address?: string | null
          nda_template_id: string
          signature_date?: string
          signature_name: string
          signed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          ip_address?: string | null
          nda_template_id?: string
          signature_date?: string
          signature_name?: string
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nda_signatures_nda_template_id_fkey"
            columns: ["nda_template_id"]
            isOneToOne: false
            referencedRelation: "nda_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      nda_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
      app_role: "admin" | "investor"
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
      app_role: ["admin", "investor"],
    },
  },
} as const
