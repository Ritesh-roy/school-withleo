import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMasters } from "@/lib/use-masters";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logActivity, todayISO } from "@/lib/helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bulk-entry")({
  head: () => ({ meta: [{ title: "Bulk Entry — Smart School ERP" }] }),
  component: BulkEntry,
});

interface BookRow {
  id: string;
  collection_no: number;
  collection_name: string | null;
  isbn: string | null;
  title: string;
  author: string | null;
  no_of_copies: number;
}

function BulkEntry() {
  const qc = useQueryClient();
  const { data: masters = {} } = useMasters();
  const [bookType, setBookType] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [author, setAuthor] = useState("");
  const [copies, setCopies] = useState("1");

  const { data: books = [] } = useQuery({
    queryKey: ["books-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id,collection_no,collection_name,isbn,title,author,no_of_copies")
        .eq("is_deleted", false)
        .order("collection_no", { ascending: false });
      if (error) throw error;
      return data as BookRow[];
    },
  });

  const add = async () => {
    if (!title.trim()) return toast.error("Title is required");
    const c = parseInt(copies) || 1;
    const { error } = await supabase.from("books").insert({
      title: title.trim(),
      collection_name: bookType || null,
      category: category || null,
      isbn: isbn || null,
      author: author || null,
      no_of_copies: c,
      available_copies: c,
      purchase_date: todayISO(),
    });
    if (error) return toast.error(error.message);
    toast.success("Book added");
    logActivity("Bulk add book", title);
    setTitle("");
    setIsbn("");
    setAuthor("");
    setCopies("1");
    qc.invalidateQueries({ queryKey: ["books-bulk"] });
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const del = async (id: string) => {
    await supabase.from("books").update({ is_deleted: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["books-bulk"] });
    toast.success("Removed");
  };

  const columns: Column<BookRow>[] = [
    { header: "Coll. No", cell: (b) => b.collection_no, searchValue: (b) => String(b.collection_no) },
    { header: "Book Type", cell: (b) => b.collection_name || "-" },
    { header: "ISBN", cell: (b) => b.isbn || "-", searchValue: (b) => b.isbn ?? "" },
    { header: "Title", cell: (b) => <span className="font-medium">{b.title}</span>, searchValue: (b) => b.title },
    { header: "Author", cell: (b) => b.author || "-", searchValue: (b) => b.author ?? "" },
    { header: "Copies", cell: (b) => b.no_of_copies },
    {
      header: "Action",
      className: "text-right",
      cell: (b) => (
        <div className="text-right">
          <button onClick={() => del(b.id)} className="text-destructive hover:opacity-70">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bulk Entry"
        description="Quickly add many books in succession"
        icon={<Boxes className="h-6 w-6 text-primary" />}
      />
      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Book Type</Label>
            <Select value={bookType || undefined} onValueChange={setBookType}>
              <SelectTrigger>
                <SelectValue placeholder="Book Type" />
              </SelectTrigger>
              <SelectContent>
                {(masters["book_type"] ?? []).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category || undefined} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {(masters["category"] ?? []).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ISBN</Label>
            <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Author</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Copies</Label>
            <Input type="number" value={copies} onChange={(e) => setCopies(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={add}>
            <Plus className="mr-2 h-4 w-4" /> Add Book
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <DataTable columns={columns} data={books} searchPlaceholder="Search books…" />
      </div>
    </div>
  );
}