export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  graphql_public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: Record<string, never>;
    Views: Record<string, never>;
  };
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      chat_messages: {
        Insert: {
          chat_session_id: string;
          content: string;
          created_at?: string;
          id?: string;
          role: string;
        };
        Relationships: [
          {
            columns: ["chat_session_id"];
            foreignKeyName: "chat_messages_chat_session_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "chat_sessions";
          },
        ];
        Row: {
          chat_session_id: string;
          content: string;
          created_at: string;
          id: string;
          role: string;
        };
        Update: {
          chat_session_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
      };
      chat_sessions: {
        Insert: {
          device_session_id: string;
          id?: string;
          last_activity_at?: string;
          product_id: string;
          started_at?: string;
          status?: string;
          store_id: string;
        };
        Relationships: [
          {
            columns: ["device_session_id"];
            foreignKeyName: "chat_sessions_device_session_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "device_sessions";
          },
          {
            columns: ["product_id"];
            foreignKeyName: "chat_sessions_product_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "products";
          },
        ];
        Row: {
          device_session_id: string;
          id: string;
          last_activity_at: string;
          product_id: string;
          started_at: string;
          status: string;
          store_id: string;
        };
        Update: {
          device_session_id?: string;
          id?: string;
          last_activity_at?: string;
          product_id?: string;
          started_at?: string;
          status?: string;
          store_id?: string;
        };
      };
      device_sessions: {
        Insert: {
          claimed_at?: string | null;
          dismissed_at?: string | null;
          id?: string;
          kiosk_token_hash?: string | null;
          last_activity_at?: string;
          last_presence_at?: string | null;
          label?: string | null;
          launched_by_manager_id: string;
          product_id: string;
          started_at?: string;
          state?: string;
          store_id: string;
        };
        Relationships: [
          {
            columns: ["product_id"];
            foreignKeyName: "device_sessions_product_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "products";
          },
        ];
        Row: {
          claimed_at: string | null;
          dismissed_at: string | null;
          id: string;
          kiosk_token_hash: string | null;
          last_activity_at: string;
          last_presence_at: string | null;
          label: string | null;
          launched_by_manager_id: string;
          product_id: string;
          started_at: string;
          state: string;
          store_id: string;
        };
        Update: {
          claimed_at?: string | null;
          dismissed_at?: string | null;
          id?: string;
          kiosk_token_hash?: string | null;
          last_activity_at?: string;
          last_presence_at?: string | null;
          label?: string | null;
          launched_by_manager_id?: string;
          product_id?: string;
          started_at?: string;
          state?: string;
          store_id?: string;
        };
      };
      leads: {
        Insert: {
          ai_summary?: string | null;
          created_at?: string;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          id?: string;
          inferred_interest?: string | null;
          next_best_product?: string | null;
          product_id: string;
          store_id: string;
        };
        Relationships: [
          {
            columns: ["product_id"];
            foreignKeyName: "leads_product_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "products";
          },
        ];
        Row: {
          ai_summary: string | null;
          created_at: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          id: string;
          inferred_interest: string | null;
          next_best_product: string | null;
          product_id: string;
          store_id: string;
        };
        Update: {
          ai_summary?: string | null;
          created_at?: string;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          id?: string;
          inferred_interest?: string | null;
          next_best_product?: string | null;
          product_id?: string;
          store_id?: string;
        };
      };
      products: {
        Insert: {
          brand: string;
          category: string;
          comparison_snippet_markdown: string;
          created_at?: string;
          details_markdown: string;
          id?: string;
          idle_media_url: string;
          name: string;
          source_urls?: string[];
          store_id: string;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          brand: string;
          category: string;
          comparison_snippet_markdown: string;
          created_at: string;
          details_markdown: string;
          id: string;
          idle_media_url: string;
          name: string;
          source_urls: string[];
          store_id: string;
          updated_at: string;
        };
        Update: {
          brand?: string;
          category?: string;
          comparison_snippet_markdown?: string;
          created_at?: string;
          details_markdown?: string;
          id?: string;
          idle_media_url?: string;
          name?: string;
          source_urls?: string[];
          store_id?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
  };
}
