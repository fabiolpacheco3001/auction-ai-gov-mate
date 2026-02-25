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
      bens: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          estado: string
          id: string
          localizacao: string
          municipio: string
          processo_id: string | null
          quantidade: number
          tombamento: string
          valor_estimado: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          descricao: string
          estado?: string
          id?: string
          localizacao?: string
          municipio?: string
          processo_id?: string | null
          quantidade?: number
          tombamento?: string
          valor_estimado?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          estado?: string
          id?: string
          localizacao?: string
          municipio?: string
          processo_id?: string | null
          quantidade?: number
          tombamento?: string
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "bens_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_sistema: {
        Row: {
          data_atualizacao: string
          id: string
          prompt_classificacao_csv: string
          usuario_atualizacao: string
        }
        Insert: {
          data_atualizacao?: string
          id?: string
          prompt_classificacao_csv: string
          usuario_atualizacao?: string
        }
        Update: {
          data_atualizacao?: string
          id?: string
          prompt_classificacao_csv?: string
          usuario_atualizacao?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          created_at: string
          data: string
          id: string
          nome: string
          processo_id: string | null
          processo_titulo: string
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          nome: string
          processo_id?: string | null
          processo_titulo?: string
          status?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          nome?: string
          processo_id?: string | null
          processo_titulo?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          categoria: string
          created_at: string
          id: string
          numero: number
          preco_aprovado: number | null
          preco_sugerido: number
          processo_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          numero: number
          preco_aprovado?: number | null
          preco_sugerido?: number
          processo_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          numero?: number
          preco_aprovado?: number | null
          preco_sugerido?: number
          processo_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_bens: {
        Row: {
          bem_id: string
          id: string
          lote_id: string
        }
        Insert: {
          bem_id: string
          id?: string
          lote_id: string
        }
        Update: {
          bem_id?: string
          id?: string
          lote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_bens_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_bens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          arrecadacao_estimada: number
          arrecadacao_real: number | null
          created_at: string
          data_upload: string
          id: string
          orgao: string
          status: string
          titulo: string
          total_bens: number
          total_lotes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          arrecadacao_estimada?: number
          arrecadacao_real?: number | null
          created_at?: string
          data_upload?: string
          id?: string
          orgao: string
          status?: string
          titulo: string
          total_bens?: number
          total_lotes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          arrecadacao_estimada?: number
          arrecadacao_real?: number | null
          created_at?: string
          data_upload?: string
          id?: string
          orgao?: string
          status?: string
          titulo?: string
          total_bens?: number
          total_lotes?: number
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
