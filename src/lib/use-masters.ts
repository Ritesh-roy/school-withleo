import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MasterKey =
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
  | "status";

export function useMasters() {
  return useQuery({
    queryKey: ["masters", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_masters")
        .select("name,master_type,status")
        .eq("status", true)
        .order("name");
      if (error) throw error;
      const grouped: Record<string, string[]> = {};
      (data ?? []).forEach((r) => {
        (grouped[r.master_type] ??= []).push(r.name);
      });
      return grouped;
    },
  });
}