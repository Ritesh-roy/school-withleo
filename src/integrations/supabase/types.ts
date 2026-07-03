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
      activity_logs: {
        Row: {
          action: string
          actor_name: string | null
          created_at: string
          detail: string | null
          event_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      almirahs: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          room_id: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          room_id: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          room_id?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "almirahs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      book_issues: {
        Row: {
          book_id: string
          created_at: string
          created_by: string | null
          due_date: string
          fine_amount: number
          fine_collected: number
          id: string
          issue_date: string
          member_id: string
          remarks: string | null
          return_date: string | null
          status: Database["public"]["Enums"]["issue_status"]
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          fine_amount?: number
          fine_collected?: number
          id?: string
          issue_date?: string
          member_id: string
          remarks?: string | null
          return_date?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          fine_amount?: number
          fine_collected?: number
          id?: string
          issue_date?: string
          member_id?: string
          remarks?: string | null
          return_date?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_issues_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_issues_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      book_locations: {
        Row: {
          almirah_id: string | null
          book_id: string
          building_id: string | null
          campus_id: string | null
          floor_id: string | null
          position: number | null
          rack_id: string | null
          room_id: string | null
          shelf_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          almirah_id?: string | null
          book_id: string
          building_id?: string | null
          campus_id?: string | null
          floor_id?: string | null
          position?: number | null
          rack_id?: string | null
          room_id?: string | null
          shelf_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          almirah_id?: string | null
          book_id?: string
          building_id?: string | null
          campus_id?: string | null
          floor_id?: string | null
          position?: number | null
          rack_id?: string | null
          room_id?: string | null
          shelf_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_locations_almirah_id_fkey"
            columns: ["almirah_id"]
            isOneToOne: false
            referencedRelation: "almirahs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "rack_inventory"
            referencedColumns: ["rack_id"]
          },
          {
            foreignKeyName: "book_locations_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_locations_shelf_id_fkey"
            columns: ["shelf_id"]
            isOneToOne: false
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
        ]
      }
      book_movements: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          book_id: string
          created_at: string
          event_type: string
          from_snapshot: Json | null
          id: string
          remarks: string | null
          to_snapshot: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          book_id: string
          created_at?: string
          event_type: string
          from_snapshot?: Json | null
          id?: string
          remarks?: string | null
          to_snapshot?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          book_id?: string
          created_at?: string
          event_type?: string
          from_snapshot?: Json | null
          id?: string
          remarks?: string | null
          to_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "book_movements_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_transfers: {
        Row: {
          book_id: string
          from_rack_id: string | null
          from_snapshot: Json | null
          id: string
          moved_at: string
          moved_by: string | null
          moved_by_name: string | null
          remarks: string | null
          to_rack_id: string | null
          to_snapshot: Json | null
        }
        Insert: {
          book_id: string
          from_rack_id?: string | null
          from_snapshot?: Json | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          moved_by_name?: string | null
          remarks?: string | null
          to_rack_id?: string | null
          to_snapshot?: Json | null
        }
        Update: {
          book_id?: string
          from_rack_id?: string | null
          from_snapshot?: Json | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          moved_by_name?: string | null
          remarks?: string | null
          to_rack_id?: string | null
          to_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "book_transfers_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_transfers_from_rack_id_fkey"
            columns: ["from_rack_id"]
            isOneToOne: false
            referencedRelation: "rack_inventory"
            referencedColumns: ["rack_id"]
          },
          {
            foreignKeyName: "book_transfers_from_rack_id_fkey"
            columns: ["from_rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_transfers_to_rack_id_fkey"
            columns: ["to_rack_id"]
            isOneToOne: false
            referencedRelation: "rack_inventory"
            referencedColumns: ["rack_id"]
          },
          {
            foreignKeyName: "book_transfers_to_rack_id_fkey"
            columns: ["to_rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          access_type: string | null
          author: string | null
          available_copies: number
          category: string | null
          collection_name: string | null
          collection_no: number
          content: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          damage_date: string | null
          edition: string | null
          editor: string | null
          id: string
          is_deleted: boolean
          isbn: string | null
          language: string | null
          location: string | null
          mrp: number | null
          no_of_copies: number
          no_of_pages: number | null
          place: string | null
          price: number | null
          publisher: string | null
          publishing_year: string | null
          purchase_date: string | null
          status: string | null
          subject: string | null
          title: string
          updated_at: string
          volume: string | null
        }
        Insert: {
          access_type?: string | null
          author?: string | null
          available_copies?: number
          category?: string | null
          collection_name?: string | null
          collection_no?: never
          content?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          damage_date?: string | null
          edition?: string | null
          editor?: string | null
          id?: string
          is_deleted?: boolean
          isbn?: string | null
          language?: string | null
          location?: string | null
          mrp?: number | null
          no_of_copies?: number
          no_of_pages?: number | null
          place?: string | null
          price?: number | null
          publisher?: string | null
          publishing_year?: string | null
          purchase_date?: string | null
          status?: string | null
          subject?: string | null
          title: string
          updated_at?: string
          volume?: string | null
        }
        Update: {
          access_type?: string | null
          author?: string | null
          available_copies?: number
          category?: string | null
          collection_name?: string | null
          collection_no?: never
          content?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          damage_date?: string | null
          edition?: string | null
          editor?: string | null
          id?: string
          is_deleted?: boolean
          isbn?: string | null
          language?: string | null
          location?: string | null
          mrp?: number | null
          no_of_copies?: number
          no_of_pages?: number | null
          place?: string | null
          price?: number | null
          publisher?: string | null
          publishing_year?: string | null
          purchase_date?: string | null
          status?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          volume?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          campus_id: string
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          campus_id: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          campus_id?: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          level_no: number | null
          name: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          level_no?: number | null
          name: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          level_no?: number | null
          name?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      library_masters: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          master_type: Database["public"]["Enums"]["master_type"]
          name: string
          status: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          master_type: Database["public"]["Enums"]["master_type"]
          name: string
          status?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          master_type?: Database["public"]["Enums"]["master_type"]
          name?: string
          status?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          expiry_date: string | null
          gender: string | null
          id: string
          is_active: boolean
          member_no: number
          member_type: Database["public"]["Enums"]["member_type"]
          membership_date: string | null
          mobile_no: string | null
          name: string
          photo_url: string | null
          pin_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          expiry_date?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          member_no?: never
          member_type?: Database["public"]["Enums"]["member_type"]
          membership_date?: string | null
          mobile_no?: string | null
          name: string
          photo_url?: string | null
          pin_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          expiry_date?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          member_no?: never
          member_type?: Database["public"]["Enums"]["member_type"]
          membership_date?: string | null
          mobile_no?: string | null
          name?: string
          photo_url?: string | null
          pin_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      racks: {
        Row: {
          almirah_id: string
          capacity: number
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          almirah_id: string
          capacity?: number
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          almirah_id?: string
          capacity?: number
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "racks_almirah_id_fkey"
            columns: ["almirah_id"]
            isOneToOne: false
            referencedRelation: "almirahs"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          floor_id: string
          id: string
          name: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          floor_id: string
          id?: string
          name: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          floor_id?: string
          id?: string
          name?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          damage_charge: number
          default_issue_days: number
          email: string | null
          fine_per_day: number
          id: string
          library_rules: string | null
          logo_url: string | null
          lost_book_charge: number
          phone: string | null
          school_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          damage_charge?: number
          default_issue_days?: number
          email?: string | null
          fine_per_day?: number
          id?: string
          library_rules?: string | null
          logo_url?: string | null
          lost_book_charge?: number
          phone?: string | null
          school_name?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          damage_charge?: number
          default_issue_days?: number
          email?: string | null
          fine_per_day?: number
          id?: string
          library_rules?: string | null
          logo_url?: string | null
          lost_book_charge?: number
          phone?: string | null
          school_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shelves: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          position: number | null
          rack_id: string
          status: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          position?: number | null
          rack_id: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          position?: number | null
          rack_id?: string
          status?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shelves_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "rack_inventory"
            referencedColumns: ["rack_id"]
          },
          {
            foreignKeyName: "shelves_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
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
      rack_inventory: {
        Row: {
          almirah_id: string | null
          available: number | null
          capacity: number | null
          current_count: number | null
          rack_id: string | null
          rack_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "racks_almirah_id_fkey"
            columns: ["almirah_id"]
            isOneToOne: false
            referencedRelation: "almirahs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_book_atomic: {
        Args: {
          _allow_overdue?: boolean
          _book_id: string
          _due_date: string
          _issue_date: string
          _member_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "librarian" | "teacher" | "student"
      issue_status: "issued" | "returned" | "overdue" | "lost"
      master_type:
        | "library"
        | "book_type"
        | "language"
        | "category"
        | "author"
        | "publisher"
        | "editor"
        | "access_type"
        | "subject"
        | "location"
        | "status"
      member_type: "student" | "teacher" | "staff"
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
      app_role: ["super_admin", "admin", "librarian", "teacher", "student"],
      issue_status: ["issued", "returned", "overdue", "lost"],
      master_type: [
        "library",
        "book_type",
        "language",
        "category",
        "author",
        "publisher",
        "editor",
        "access_type",
        "subject",
        "location",
        "status",
      ],
      member_type: ["student", "teacher", "staff"],
    },
  },
} as const
