import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, BookMarked, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/library/PageHeader";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_app/library-master")({
  head: () => ({ meta: [{ title: "Library Master — Smart School ERP" }] }),
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

  const label = TABS.find((t) => t.key === active)!.label;

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
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Please enter a name");
    if (editId) {
      const { error } = await supabase
        .from("library_masters")
        .update({ name: name.trim(), status })
        .eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success(`${label} updated`);
      logActivity("Update master", `${label}: ${name}`);
    } else {
      const { error } = await supabase.from("library_masters").insert({
        master_type: active,
        name: name.trim(),
        status,
      });
      if (error) return toast.error(error.message);
      toast.success(`${label} added`);
      logActivity("Add master", `${label}: ${name}`);
    }
    reset();
    qc.invalidateQueries({ queryKey: ["masters", active] });
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

      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 font-semibold">{label} Master</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder={`${label} Name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={status}
              onCheckedChange={(v) => setStatus(Boolean(v))}
            />
            Active
          </label>
          <div className="ml-auto flex gap-2">
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              {editId ? "Update" : "Save"}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

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
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          r.status
                            ? "bg-[var(--gradient-green)] text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {r.status ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          setEditId(r.id);
                          setName(r.name);
                          setStatus(r.status);
                        }}
                        className="mr-2 text-primary hover:opacity-70"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
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