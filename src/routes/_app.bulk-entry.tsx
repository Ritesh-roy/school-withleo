import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMasters } from "@/lib/use-masters";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { FormField } from "@/components/library/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logActivity, todayISO } from "@/lib/helpers";
import {
  handleFormKeyDown,
  restrict,
  sanitize,
  validators,
} from "@/lib/form-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bulk-entry")({
  head: () => ({ meta: [{ title: "Bulk Entry — School withleo" }] }),
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      bookType: validators.required(bookType, "Book Type"),
      category: validators.required(category, "Category"),
      title: validators.required(title, "Book Title"),
      isbn: isbn ? validators.isbn(isbn) : null,
      copies:
        validators.required(copies, "Copies") ||
        validators.greaterThanZero(copies, "Copies"),
    }),
    [bookType, category, title, isbn, copies],
  );
  const isValid = Object.values(errors).every((v) => !v);
  const err = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

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
    setTouched({ bookType: true, category: true, title: true, isbn: true, copies: true });
    if (!isValid) return toast.error("Please fix the highlighted fields.");
    if (saving) return;
    setSaving(true);
    const c = parseInt(copies) || 1;
    try {
      const { error } = await supabase.from("books").insert({
        title: title.trim(),
        collection_name: bookType,
        category,
        isbn: isbn.trim() || null,
        author: author.trim() || null,
        no_of_copies: c,
        available_copies: c,
        purchase_date: todayISO(),
      });
      if (error) throw error;
      toast.success("Book added successfully");
      logActivity("Bulk add book", title);
      setTitle("");
      setIsbn("");
      setAuthor("");
      setCopies("1");
      setTouched({});
      qc.invalidateQueries({ queryKey: ["books-bulk"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add book");
    } finally {
      setSaving(false);
    }
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
          <button onClick={() => del(b.id)} aria-label="Remove" className="text-destructive hover:opacity-70">
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
      <form
        className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        onKeyDown={handleFormKeyDown}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Book Type" required error={err("bookType")}>
            <Select
              value={bookType || undefined}
              onValueChange={(v) => {
                setBookType(v);
                touch("bookType");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select book type" />
              </SelectTrigger>
              <SelectContent>
                {(masters["book_type"] ?? []).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Category" required error={err("category")}>
            <Select
              value={category || undefined}
              onValueChange={(v) => {
                setCategory(v);
                touch("category");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(masters["category"] ?? []).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="ISBN" error={err("isbn")} hint="10 or 13 digits (hyphens allowed).">
            <Input
              placeholder="Enter ISBN number"
              inputMode="numeric"
              value={isbn}
              onKeyDown={restrict.isbn}
              onChange={(e) => setIsbn(sanitize.isbn(e.target.value).slice(0, 17))}
              onBlur={() => touch("isbn")}
            />
          </FormField>
          <FormField label="Title" required error={err("title")}>
            <Input
              placeholder="Enter book title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => touch("title")}
            />
          </FormField>
          <FormField label="Author">
            <Input
              placeholder="Enter author name"
              value={author}
              maxLength={150}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </FormField>
          <FormField label="Copies" required error={err("copies")}>
            <Input
              placeholder="Enter number of copies"
              inputMode="numeric"
              value={copies}
              onKeyDown={restrict.digits}
              onChange={(e) => setCopies(sanitize.digits(e.target.value, 5))}
              onBlur={() => touch("copies")}
            />
          </FormField>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={saving || !isValid}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Book
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <DataTable columns={columns} data={books} searchPlaceholder="Search books…" />
      </div>
    </div>
  );
}
