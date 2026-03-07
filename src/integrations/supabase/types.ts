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
      api_tokens: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          last_used_at: string | null
          nome: string
          token: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          last_used_at?: string | null
          nome?: string
          token?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          last_used_at?: string | null
          nome?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
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
          valor_medio_site1: number | null
          valor_medio_site2: number | null
          valor_medio_site3: number | null
          valor_sugerido: number | null
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
          valor_medio_site1?: number | null
          valor_medio_site2?: number | null
          valor_medio_site3?: number | null
          valor_sugerido?: number | null
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
          valor_medio_site1?: number | null
          valor_medio_site2?: number | null
          valor_medio_site3?: number | null
          valor_sugerido?: number | null
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
          logo_url: string | null
          prompt_classificacao_csv: string
          usuario_atualizacao: string
        }
        Insert: {
          data_atualizacao?: string
          id?: string
          logo_url?: string | null
          prompt_classificacao_csv: string
          usuario_atualizacao?: string
        }
        Update: {
          data_atualizacao?: string
          id?: string
          logo_url?: string | null
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
      orgao_usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          is_admin: boolean
          login: string
          nome: string
          orgao_id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          is_admin?: boolean
          login: string
          nome: string
          orgao_id: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          is_admin?: boolean
          login?: string
          nome?: string
          orgao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgao_usuarios_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      orgaos: {
        Row: {
          ativo: boolean
          cidade: string
          created_at: string
          data_inicio: string
          data_termino: string | null
          id: string
          nome: string
          pacote_processos: number | null
          sigla: string
          uf: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade: string
          created_at?: string
          data_inicio: string
          data_termino?: string | null
          id?: string
          nome: string
          pacote_processos?: number | null
          sigla: string
          uf: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string
          created_at?: string
          data_inicio?: string
          data_termino?: string | null
          id?: string
          nome?: string
          pacote_processos?: number | null
          sigla?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
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
      sites_precificacao: {
        Row: {
          created_at: string
          descricao: string
          id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_admin_orgao_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _orgao_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "org_admin" | "user"
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
      app_role: ["super_admin", "org_admin", "user"],
    },
  },
} as const
