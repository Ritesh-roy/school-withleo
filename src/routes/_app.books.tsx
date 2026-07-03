import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Save,
  RotateCcw,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMasters } from "@/lib/use-masters";
import { PageHeader } from "@/components/library/PageHeader";
import { DataTable, type Column } from "@/components/library/DataTable";
import { FormField } from "@/components/library/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { currency, logActivity, todayISO } from "@/lib/helpers";
import { exportToExcel, exportToPdf } from "@/lib/exports";
import {
  handleFormKeyDown,
  restrict,
  sanitize,
  validators,
  CURRENT_YEAR,
} from "@/lib/form-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/books")({
  head: () => ({ meta: [{ title: "Book Master — School withleo" }] }),
  component: BookMaster,
});

interface BookRow {
  id: string;
  collection_no: number;
  collection_name: string | null;
  title: string;
  isbn: string | null;
  author: string | null;
  editor: string | null;
  edition: string | null;
  volume: string | null;
  category: string | null;
  access_type: string | null;
  language: string | null;
  publisher: string | null;
  publishing_year: string | null;
  place: string | null;
  subject: string | null;
  location: string | null;
  status: string | null;
  no_of_pages: number | null;
  no_of_copies: number;
  available_copies: number;
  price: number | null;
  mrp: number | null;
  content: string | null;
  cover_image: string | null;
  purchase_date: string | null;
}

const empty = {
  title: "",
  collection_name: "",
  isbn: "",
  author: "",
  editor: "",
  edition: "",
  volume: "",
  category: "",
  access_type: "Issuable",
  language: "",
  publisher: "",
  publishing_year: "",
  place: "",
  subject: "",
  location: "",
  status: "",
  no_of_pages: "",
  no_of_copies: "1",
  price: "",
  mrp: "",
  content: "",
  cover_image: "",
  purchase_date: todayISO(),
};

// Module-scope Dropdown — preserves identity across renders (focus stays put).
function Dropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No options. Add in Library Master.
          </div>
        ) : (
          options.map((n) => (
            <SelectItem key={n} value={n}>
              {n}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function BookMaster() {
  const qc = useQueryClient();
  const { data: masters = {} } = useMasters();
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = (k: keyof typeof empty, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.purchase_date = validators.required(form.purchase_date, "Collection Date");
    e.collection_name = validators.required(form.collection_name, "Book Type");
    e.isbn = validators.required(form.isbn, "ISBN") || validators.isbn(form.isbn);
    e.title = validators.required(form.title, "Book Title");
    e.author = validators.required(form.author, "Author");
    e.category = validators.required(form.category, "Category");
    e.access_type = validators.required(form.access_type, "Access Type");
    e.language = validators.required(form.language, "Language");
    e.publisher = validators.required(form.publisher, "Publisher");
    e.publishing_year =
      validators.required(form.publishing_year, "Publishing Year") ||
      validators.year(form.publishing_year);
    e.status = validators.required(form.status, "Status");
    e.no_of_copies =
      validators.required(form.no_of_copies, "Copies") ||
      validators.greaterThanZero(form.no_of_copies, "Copies");
    // Price/MRP: optional numeric, must be >= 0 when provided.
    e.price = validators.positiveNumber(form.price, "Price");
    e.mrp = validators.positiveNumber(form.mrp, "MRP");
    e.cover_image = form.cover_image ? validators.url(form.cover_image) : null;
    e.content = null;
    // description/content is optional — no validation needed
    // Pages: optional integer, must be > 0 when provided.
    e.no_of_pages = form.no_of_pages
      ? validators.positiveInt(form.no_of_pages, "Pages") ||
        (Number(form.no_of_pages) > 0 ? null : "Pages must be greater than zero.")
      : null;
    return e;
  }, [form]);

  const isValid = Object.values(errors).every((v) => !v);
  const err = (k: string) => (touched[k] ? errors[k] : null);

  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("is_deleted", false)
        .order("collection_no", { ascending: false });
      if (error) throw error;
      return data as BookRow[];
    },
  });

  const reset = () => {
    setForm({ ...empty });
    setEditId(null);
    setTouched({});
  };

  const save = async () => {
    const allTouched = Object.keys(errors).reduce<Record<string, boolean>>(
      (acc, k) => ({ ...acc, [k]: true }),
      {},
    );
    setTouched(allTouched);
    if (!isValid) return toast.error("Please fix the highlighted fields.");
    if (saving) return;
    setSaving(true);
    const copies = parseInt(form.no_of_copies) || 1;
    const payload = {
      title: form.title.trim(),
      collection_name: form.collection_name || null,
      isbn: form.isbn.trim() || null,
      author: form.author.trim() || null,
      editor: form.editor.trim() || null,
      edition: form.edition.trim() || null,
      volume: form.volume.trim() || null,
      category: form.category || null,
      access_type: form.access_type || null,
      language: form.language || null,
      publisher: form.publisher.trim() || null,
      publishing_year: form.publishing_year || null,
      place: form.place.trim() || null,
      subject: form.subject || null,
      location: form.location || null,
      status: form.status || null,
      no_of_pages: form.no_of_pages ? parseInt(form.no_of_pages) : null,
      no_of_copies: copies,
      price: form.price === "" ? null : parseFloat(form.price),
      mrp: form.mrp === "" ? null : parseFloat(form.mrp),
      content: form.content.trim() || null,
      cover_image: form.cover_image.trim() || null,
      purchase_date: form.purchase_date || null,
    };
    try {
      if (editId) {
        const { error } = await supabase.from("books").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Book updated successfully");
        logActivity("Update book", form.title);
      } else {
        const { error } = await supabase
          .from("books")
          .insert({ ...payload, available_copies: copies });
        if (error) throw error;
        toast.success("Book added successfully");
        logActivity("Add book", form.title);
      }
      reset();
      qc.invalidateQueries({ queryKey: ["books"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save book");
    } finally {
      setSaving(false);
    }
  };

  const edit = (b: BookRow) => {
    setEditId(b.id);
    setForm({
      title: b.title,
      collection_name: b.collection_name ?? "",
      isbn: b.isbn ?? "",
      author: b.author ?? "",
      editor: b.editor ?? "",
      edition: b.edition ?? "",
      volume: b.volume ?? "",
      category: b.category ?? "",
      access_type: b.access_type ?? "Issuable",
      language: b.language ?? "",
      publisher: b.publisher ?? "",
      publishing_year: b.publishing_year ?? "",
      place: b.place ?? "",
      subject: b.subject ?? "",
      location: b.location ?? "",
      status: b.status ?? "",
      no_of_pages: b.no_of_pages != null ? String(b.no_of_pages) : "",
      no_of_copies: String(b.no_of_copies),
      price: b.price != null ? String(b.price) : "",
      mrp: b.mrp != null ? String(b.mrp) : "",
      content: b.content ?? "",
      cover_image: b.cover_image ?? "",
      purchase_date: b.purchase_date ?? todayISO(),
    });
    setTouched({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("books")
      .update({ is_deleted: true })
      .eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Book deleted");
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const exportRows = books.map((b) => ({
    collection_no: b.collection_no,
    title: b.title,
    isbn: b.isbn,
    author: b.author,
    category: b.category,
    publisher: b.publisher,
    copies: b.no_of_copies,
    available: b.available_copies,
    price: b.price,
  }));
  const exportCols = [
    { header: "Coll. No", key: "collection_no" },
    { header: "Title", key: "title" },
    { header: "ISBN", key: "isbn" },
    { header: "Author", key: "author" },
    { header: "Category", key: "category" },
    { header: "Publisher", key: "publisher" },
    { header: "Copies", key: "copies" },
    { header: "Available", key: "available" },
    { header: "Price", key: "price" },
  ];

  const columns: Column<BookRow>[] = [
    {
      header: "Coll. No",
      cell: (b) => b.collection_no,
      searchValue: (b) => String(b.collection_no),
    },
    {
      header: "Title",
      cell: (b) => <span className="font-medium">{b.title}</span>,
      searchValue: (b) => b.title,
    },
    { header: "ISBN", cell: (b) => b.isbn || "-", searchValue: (b) => b.isbn ?? "" },
    { header: "Author", cell: (b) => b.author || "-", searchValue: (b) => b.author ?? "" },
    { header: "Category", cell: (b) => b.category || "-", searchValue: (b) => b.category ?? "" },
    {
      header: "Copies",
      cell: (b) => (
        <span>
          {b.available_copies}/{b.no_of_copies}
        </span>
      ),
    },
    { header: "Price", cell: (b) => currency(b.price) },
    {
      header: "Action",
      className: "text-right",
      cell: (b) => (
        <div className="text-right">
          <button
            onClick={() => edit(b)}
            aria-label={`Edit ${b.title}`}
            className="mr-2 text-primary hover:opacity-70"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteId(b.id)}
            aria-label={`Delete ${b.title}`}
            className="text-destructive hover:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const wrap = (
    label: string,
    key: string,
    required: boolean,
    child: ReactNode,
    hint?: string,
  ) => (
    <FormField label={label} required={required} error={err(key)} hint={hint}>
      {child}
    </FormField>
  );

  return (
    <div>
      <PageHeader
        title="Library Materials Entry"
        description="Add and manage your book catalogue"
        icon={<BookOpen className="h-6 w-6 text-primary" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => exportToExcel("Books", exportCols, exportRows)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => exportToPdf("Book Catalogue", exportCols, exportRows)}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <form
        className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={handleFormKeyDown}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wrap(
            "Collection / Purchase Date",
            "purchase_date",
            true,
            <Input
              type="date"
              value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
              onBlur={() => touch("purchase_date")}
            />,
          )}
          {wrap(
            "Book Type",
            "collection_name",
            true,
            <Dropdown
              options={masters["book_type"] ?? []}
              value={form.collection_name}
              onChange={(v) => {
                set("collection_name", v);
                touch("collection_name");
              }}
              placeholder="Select book type"
            />,
          )}
          {wrap(
            "ISBN No",
            "isbn",
            true,
            <Input
              placeholder="Enter ISBN number"
              inputMode="numeric"
              value={form.isbn}
              onKeyDown={restrict.isbn}
              onChange={(e) => set("isbn", sanitize.isbn(e.target.value).slice(0, 17))}
              onBlur={() => touch("isbn")}
            />,
            "10 or 13 digits (hyphens allowed).",
          )}
          {wrap(
            "Title",
            "title",
            true,
            <Input
              placeholder="Enter book title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => touch("title")}
              maxLength={200}
            />,
          )}
          {wrap(
            "Author",
            "author",
            true,
            <Input
              placeholder="Enter author name"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              onBlur={() => touch("author")}
              maxLength={150}
            />,
          )}
          {wrap(
            "Editor",
            "editor",
            false,
            <Input
              placeholder="Enter editor name"
              value={form.editor}
              onChange={(e) => set("editor", e.target.value)}
              maxLength={150}
            />,
          )}
          {wrap(
            "Edition",
            "edition",
            false,
            <Input
              placeholder="Enter edition (e.g. 2nd)"
              value={form.edition}
              onChange={(e) => set("edition", e.target.value)}
              maxLength={40}
            />,
          )}
          {wrap(
            "Volume",
            "volume",
            false,
            <Input
              placeholder="Enter volume"
              value={form.volume}
              onChange={(e) => set("volume", e.target.value)}
              maxLength={40}
            />,
          )}
          {wrap(
            "Category",
            "category",
            true,
            <Dropdown
              options={masters["category"] ?? []}
              value={form.category}
              onChange={(v) => {
                set("category", v);
                touch("category");
              }}
              placeholder="Select category"
            />,
          )}
          {wrap(
            "Access Type",
            "access_type",
            true,
            <Dropdown
              options={masters["access_type"] ?? []}
              value={form.access_type}
              onChange={(v) => {
                set("access_type", v);
                touch("access_type");
              }}
              placeholder="Select access type"
            />,
          )}
          {wrap(
            "Language",
            "language",
            true,
            <Dropdown
              options={masters["language"] ?? []}
              value={form.language}
              onChange={(v) => {
                set("language", v);
                touch("language");
              }}
              placeholder="Select language"
            />,
          )}
          {wrap(
            "Publisher",
            "publisher",
            true,
            <Input
              placeholder="Enter publisher name"
              value={form.publisher}
              onChange={(e) => set("publisher", e.target.value)}
              onBlur={() => touch("publisher")}
              maxLength={150}
            />,
          )}
          {wrap(
            "Publishing Year",
            "publishing_year",
            true,
            <Input
              placeholder="Enter publishing year (YYYY)"
              inputMode="numeric"
              value={form.publishing_year}
              onKeyDown={restrict.digits}
              onChange={(e) => set("publishing_year", sanitize.digits(e.target.value, 4))}
              onBlur={() => touch("publishing_year")}
            />,
            `Between 1900 and ${CURRENT_YEAR}.`,
          )}
          {wrap(
            "Place",
            "place",
            false,
            <Input
              placeholder="Enter place of publication"
              value={form.place}
              onChange={(e) => set("place", e.target.value)}
              maxLength={100}
            />,
          )}
          {wrap(
            "Subject",
            "subject",
            false,
            <Dropdown
              options={masters["subject"] ?? []}
              value={form.subject}
              onChange={(v) => set("subject", v)}
              placeholder="Select subject"
            />,
          )}
          {wrap(
            "Location",
            "location",
            false,
            <Dropdown
              options={masters["location"] ?? []}
              value={form.location}
              onChange={(v) => set("location", v)}
              placeholder="Select location"
            />,
          )}
          {wrap(
            "Status",
            "status",
            true,
            <Dropdown
              options={masters["status"] ?? []}
              value={form.status}
              onChange={(v) => {
                set("status", v);
                touch("status");
              }}
              placeholder="Select status"
            />,
          )}
          {wrap(
            "No. of Pages",
            "no_of_pages",
            false,
            <Input
              placeholder="Enter number of pages"
              inputMode="numeric"
              value={form.no_of_pages}
              onKeyDown={restrict.digits}
              onChange={(e) => set("no_of_pages", sanitize.digits(e.target.value, 6))}
              onBlur={() => touch("no_of_pages")}
            />,
          )}
          {wrap(
            "No. of Copies",
            "no_of_copies",
            true,
            <Input
              placeholder="Enter number of copies"
              inputMode="numeric"
              value={form.no_of_copies}
              onKeyDown={restrict.digits}
              onChange={(e) => set("no_of_copies", sanitize.digits(e.target.value, 5))}
              onBlur={() => touch("no_of_copies")}
            />,
          )}
          {wrap(
            "Price",
            "price",
            true,
            <Input
              placeholder="Enter price"
              inputMode="decimal"
              value={form.price}
              onKeyDown={restrict.decimal}
              onChange={(e) => set("price", sanitize.decimal(e.target.value))}
              onBlur={() => touch("price")}
            />,
          )}
          {wrap(
            "MRP",
            "mrp",
            true,
            <Input
              placeholder="Enter MRP"
              inputMode="decimal"
              value={form.mrp}
              onKeyDown={restrict.decimal}
              onChange={(e) => set("mrp", sanitize.decimal(e.target.value))}
              onBlur={() => touch("mrp")}
            />,
          )}
          {wrap(
            "Cover Image URL",
            "cover_image",
            true,
            <Input
              placeholder="https://…"
              value={form.cover_image}
              onChange={(e) => set("cover_image", e.target.value)}
              onBlur={() => touch("cover_image")}
            />,
          )}
        </div>
        <div className="mt-4">
          {wrap(
            "Content / Description",
            "content",
            true,
            <Textarea
              placeholder="Enter description…"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              onBlur={() => touch("content")}
              rows={2}
              maxLength={2000}
            />,
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="submit" disabled={saving || !isValid}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {editId ? "Update" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={reset} disabled={saving}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={books}
          searchPlaceholder="Search books by title, ISBN, author…"
          pageSize={10}
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              The book will be removed from the catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
