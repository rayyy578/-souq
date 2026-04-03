export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: "buyer" | "seller" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: "buyer" | "seller" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: "buyer" | "seller" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      sellers: {
        Row: {
          id: string;
          user_id: string;
          stripe_account_id: string | null;
          store_name: string;
          description: string | null;
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_account_id?: string | null;
          store_name: string;
          description?: string | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_account_id?: string | null;
          store_name?: string;
          description?: string | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          name: string;
          description: string;
          price_millimes: number;
          images: string[];
          stock: number;
          category: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          name: string;
          description: string;
          price_millimes: number;
          images?: string[];
          stock?: number;
          category: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          name?: string;
          description?: string;
          price_millimes?: number;
          images?: string[];
          stock?: number;
          category?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          stripe_payment_intent_id: string | null;
          total_amount_millimes: number;
          commission_amount_millimes: number;
          status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
          shipping_address: Json;
          tracking_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          stripe_payment_intent_id?: string | null;
          total_amount_millimes: number;
          commission_amount_millimes: number;
          status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
          shipping_address: Json;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          stripe_payment_intent_id?: string | null;
          total_amount_millimes?: number;
          commission_amount_millimes?: number;
          status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
          shipping_address?: Json;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          seller_id: string;
          quantity: number;
          price_at_purchase_millimes: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          seller_id: string;
          quantity: number;
          price_at_purchase_millimes: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          seller_id?: string;
          quantity?: number;
          price_at_purchase_millimes?: number;
        };
      };
      commissions: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          amount_millimes: number;
          status: "pending" | "collected" | "paid_out";
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          amount_millimes: number;
          status?: "pending" | "collected" | "paid_out";
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          seller_id?: string;
          amount_millimes?: number;
          status?: "pending" | "collected" | "paid_out";
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
