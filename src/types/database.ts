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
          store_id?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
  };
}
