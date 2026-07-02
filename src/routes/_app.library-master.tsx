import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, BookMarked, Save, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
import { FormField } from "@/components/library/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { logActivity } from "@/lib/helpers";
import { handleFormKeyDown, validators } from "@/lib/form-utils";
import { toast } from "sonner";
import { LocationHierarchy } from "@/components/library/LocationHierarchy";

export const Route = createFileRoute("/_app/library-master")({
  head: () => ({ meta: [{ title: "Library Master — School withleo" }] }),
  component: LibraryMaster,
});

const TABS = [
  { key: "library", label: "Library" },
  { key: "book_type", label: "Book Type" },
  { key: "language", label: "Language" },
  { key: "category", label: "Category" },
  { key: "author", label: "Author" },
  { key: "publisher", label: "Publisher" },
  { key: "editor", label: "Editor" },
  { key: "access_type", label: "Access Type" },
  { key: "subject", label: "Subject" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
] as const;

type MType = (typeof TABS)[number]["key"];
type MasterRow = {
  id: string;
  name: string;
  status: boolean;
  master_type: MType;
};

function LibraryMaster() {
  const qc = useQueryClient();
  const [active, setActive] = useState<MType>("category");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const label = TABS.find((t) => t.key === active)!.label;
  const nameError = validators.required(name, `${label} Name`);

  useEffect(() => {
    setTouched(false);
  }, [active]);

  const { data: rows = [] } = useQuery({
    queryKey: ["masters", active],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_masters")
        .select("id,name,status,master_type")
        .eq("master_type", active)
        .order("name");
      if (error) throw error;
      return data as MasterRow[];
    },
  });

  const reset = () => {
    setName("");
    setStatus(true);
    setEditId(null);
    setTouched(false);
  };

  const save = async () => {
    setTouched(true);
    if (nameError) return toast.error(nameError);
    if (saving) return;
    const trimmed = name.trim();
    const dup = rows.find(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase() && r.id !== editId,
    );
    if (dup) return toast.error(`${label} "${trimmed}" already exists.`);
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from("library_masters")
          .update({ name: trimmed, status })
          .eq("id", editId);
        if (error) throw error;
        toast.success(`${label} updated successfully`);
        logActivity("Update master", `${label}: ${trimmed}`);
      } else {
        const { error } = await supabase.from("library_masters").insert({
          master_type: active,
          name: trimmed,
          status,
        });
        if (error) throw error;
        toast.success(`${label} added successfully`);
        logActivity("Add master", `${label}: ${trimmed}`);
      }
      reset();
      qc.invalidateQueries({ queryKey: ["masters", active] });
      qc.invalidateQueries({ queryKey: ["masters-all"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("library_masters")
      .delete()
      .eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success(`${label} deleted`);
    qc.invalidateQueries({ queryKey: ["masters", active] });
  };

  return (
    <div>
      <PageHeader
        title="Library Master"
        description="Manage library configuration lists"
        icon={<BookMarked className="h-6 w-6 text-primary" />}
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActive(t.key);
              reset();
            }}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "location" ? (
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 font-semibold">Location Hierarchy</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Campus → Building → Floor → Room → Almirah → Rack → Shelf. Click any item to drill into its children.
          </p>
          <LocationHierarchy />
        </div>
      ) : (
      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 font-semibold">{label} Master</h3>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          onKeyDown={handleFormKeyDown}
          className="flex flex-wrap items-start gap-4"
        >
          <FormField
            label={`${label} Name`}
            required
            error={touched ? nameError : null}
            className="min-w-[260px] flex-1"
          >
            <Input
              placeholder={`Enter ${label.toLowerCase()} name`}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </FormField>
          <label className="mt-7 flex items-center gap-2 text-sm">
            <Checkbox
              checked={status}
              onCheckedChange={(v) => setStatus(Boolean(v))}
            />
            Active
          </label>
          <div className="ml-auto mt-7 flex gap-2">
            <Button type="submit" disabled={saving || !!nameError}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editId ? "Update" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={reset} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </form>

        <div className="mt-5 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No {label.toLowerCase()} records yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      {r.status ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          setEditId(r.id);
                          setName(r.name);
                          setStatus(r.status);
                          setTouched(false);
                        }}
                        aria-label="Edit"
                        className="mr-2 text-primary hover:opacity-70"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        aria-label="Delete"
                        className="text-destructive hover:opacity-70"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
