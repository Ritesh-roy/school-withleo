import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/library/FormField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { logActivity } from "@/lib/helpers";

// 7-level hierarchy: Campus → Building → Floor → Room → Almirah → Rack → Shelf.
// Full CRUD, cascading load, per-column search, activate/deactivate toggle and
// per-parent duplicate-name validation. Persists to the Lovable Cloud backend
// (Postgres with the same tables/FKs as the bundled MySQL schema).

type Level =
  | "campus"
  | "building"
  | "floor"
  | "room"
  | "almirah"
  | "rack"
  | "shelf";

const LEVELS: Level[] = [
  "campus",
  "building",
  "floor",
  "room",
  "almirah",
  "rack",
  "shelf",
];

const LEVEL_LABELS: Record<Level, string> = {
  campus: "Campus",
  building: "Building",
  floor: "Floor",
  room: "Room",
  almirah: "Almirah",
  rack: "Rack",
  shelf: "Shelf",
};

const TABLE: Record<Level, "campuses" | "buildings" | "floors" | "rooms" | "almirahs" | "racks" | "shelves"> = {
  campus: "campuses",
  building: "buildings",
  floor: "floors",
  room: "rooms",
  almirah: "almirahs",
  rack: "racks",
  shelf: "shelves",
};

const PARENT_FK: Record<Level, string | null> = {
  campus: null,
  building: "campus_id",
  floor: "building_id",
  room: "floor_id",
  almirah: "room_id",
  rack: "almirah_id",
  shelf: "rack_id",
};

const PARENT_LEVEL: Record<Level, Level | null> = {
  campus: null,
  building: "campus",
  floor: "building",
  room: "floor",
  almirah: "room",
  rack: "almirah",
  shelf: "rack",
};

interface Node {
  id: string;
  name: string;
  code?: string | null;
  status: boolean;
  capacity?: number | null;
  position?: number | null;
  level_no?: number | null;
}

interface InventoryRow {
  rack_id: string;
  capacity: number;
  current_count: number;
  available: number;
}

export function LocationHierarchy() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<Level, string | null>>({
    campus: null,
    building: null,
    floor: null,
    room: null,
    almirah: null,
    rack: null,
    shelf: null,
  });
  const [search, setSearch] = useState<Record<Level, string>>({
    campus: "",
    building: "",
    floor: "",
    room: "",
    almirah: "",
    rack: "",
    shelf: "",
  });

  const [dialog, setDialog] = useState<{ level: Level; id: string | null } | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ level: Level; id: string; name: string } | null>(null);

  const parentIdFor = (level: Level): string | null => {
    const p = PARENT_LEVEL[level];
    return p ? selected[p] : "root";
  };

  const canShowColumn = (level: Level): boolean => {
    if (level === "campus") return true;
    const p = PARENT_LEVEL[level]!;
    return !!selected[p];
  };

  const { data: inventory = [] } = useQuery<InventoryRow[]>({
    queryKey: ["rack-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rack_inventory").select("*");
      if (error) throw error;
      return (data ?? []) as InventoryRow[];
    },
  });

  const inventoryByRack = useMemo(
    () => Object.fromEntries(inventory.map((r) => [r.rack_id, r])),
    [inventory],
  );

  const selectLevel = (level: Level, id: string | null) => {
    const next = { ...selected, [level]: id };
    const idx = LEVELS.indexOf(level);
    for (let i = idx + 1; i < LEVELS.length; i++) next[LEVELS[i]] = null;
    setSelected(next);
  };

  const openAdd = (level: Level) => {
    // Ensure parent chain is selected before allowing add.
    const p = PARENT_LEVEL[level];
    if (p && !selected[p]) {
      toast.error(`Select a ${LEVEL_LABELS[p]} first`);
      return;
    }
    setDialog({ level, id: null });
    setName("");
    setCode("");
    setCapacity("");
    setPosition("");
    setStatus(true);
  };

  const openEdit = (level: Level, node: Node) => {
    setDialog({ level, id: node.id });
    setName(node.name);
    setCode(node.code ?? "");
    setCapacity(node.capacity != null ? String(node.capacity) : "");
    setPosition(
      node.position != null
        ? String(node.position)
        : node.level_no != null
          ? String(node.level_no)
          : "",
    );
    setStatus(node.status);
  };

  const closeDialog = () => setDialog(null);

  const save = async () => {
    if (!dialog) return;
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Name is required");
    const level = dialog.level;
    const parentFk = PARENT_FK[level];
    const parentId = parentFk ? selected[PARENT_LEVEL[level]!] : null;
    if (parentFk && !parentId)
      return toast.error(`Select a ${LEVEL_LABELS[PARENT_LEVEL[level]!]} first`);

    // Duplicate check under same parent
    const siblings = qc.getQueryData<Node[]>(["loc", level, parentIdFor(level)]) ?? [];
    const dup = siblings.find(
      (n) => n.name.trim().toLowerCase() === trimmed.toLowerCase() && n.id !== dialog.id,
    );
    if (dup)
      return toast.error(
        `${LEVEL_LABELS[level]} "${trimmed}" already exists under this ${
          PARENT_LEVEL[level] ? LEVEL_LABELS[PARENT_LEVEL[level]!] : "root"
        }.`,
      );

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: trimmed, status };
      if (level !== "shelf") payload.code = code.trim() || null;
      if (level === "rack")
        payload.capacity = capacity ? Math.max(0, parseInt(capacity)) : 0;
      if (level === "floor")
        payload.level_no = position ? parseInt(position) : null;
      if (level === "shelf")
        payload.position = position ? parseInt(position) : null;
      if (parentFk) payload[parentFk] = parentId;

      if (dialog.id) {
        const { error } = await (supabase as any)
          .from(TABLE[level])
          .update(payload)
          .eq("id", dialog.id);
        if (error) throw error;
        toast.success(`${LEVEL_LABELS[level]} updated`);
        logActivity(`Update ${level}`, trimmed);
      } else {
        const { error } = await (supabase as any).from(TABLE[level]).insert(payload);
        if (error) throw error;
        toast.success(`${LEVEL_LABELS[level]} added`);
        logActivity(`Add ${level}`, trimmed);
      }
      closeDialog();
      qc.invalidateQueries({ queryKey: ["loc", level] });
      qc.invalidateQueries({ queryKey: ["rack-inventory"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (level: Level, node: Node) => {
    const { error } = await (supabase as any)
      .from(TABLE[level])
      .update({ status: !node.status })
      .eq("id", node.id);
    if (error) return toast.error(error.message);
    toast.success(`${LEVEL_LABELS[level]} ${!node.status ? "activated" : "deactivated"}`);
    qc.invalidateQueries({ queryKey: ["loc", level] });
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { level, id } = deleteTarget;
    const { error } = await supabase
      .from(TABLE[level])
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    setDeleteTarget(null);
    if (error) return toast.error(error.message);
    toast.success(`${LEVEL_LABELS[level]} removed`);
    if (selected[level] === id) selectLevel(level, null);
    qc.invalidateQueries({ queryKey: ["loc", level] });
  };

  const breadcrumb = LEVELS.filter((l) => selected[l]).map((l) => {
    const list = qc.getQueryData<Node[]>(["loc", l, parentIdFor(l)]);
    const node = list?.find((n) => n.id === selected[l]);
    return { level: l, label: node?.name ?? "…" };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Path:</span>
          {breadcrumb.length === 0 && <span>Select a Campus to begin</span>}
          {breadcrumb.map((b, i) => (
            <span key={b.level} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className="font-medium text-foreground">{b.label}</span>
              <span className="text-muted-foreground">({LEVEL_LABELS[b.level]})</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {LEVELS.map((level) =>
          canShowColumn(level) ? (
            <LevelColumn
              key={level}
              level={level}
              parentId={parentIdFor(level)}
              selectedId={selected[level]}
              search={search[level]}
              onSearch={(v) => setSearch((s) => ({ ...s, [level]: v }))}
              onSelect={(id) => selectLevel(level, id)}
              onAdd={() => openAdd(level)}
              onEdit={(n) => openEdit(level, n)}
              onDelete={(n) => setDeleteTarget({ level, id: n.id, name: n.name })}
              onToggle={(n) => toggleStatus(level, n)}
              inventoryByRack={inventoryByRack}
            />
          ) : (
            <div
              key={level}
              className="hidden rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground lg:block"
            >
              {LEVEL_LABELS[level]}
              <div className="mt-1 text-[10px]">
                Select {LEVEL_LABELS[PARENT_LEVEL[level]!]}
              </div>
            </div>
          ),
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog?.id ? "Edit" : "Add"} {dialog ? LEVEL_LABELS[dialog.level] : ""}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <FormField label="Name" required>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${LEVEL_LABELS[dialog.level]} name`}
                  maxLength={80}
                />
              </FormField>
              {dialog.level !== "shelf" && (
                <FormField label="Code">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Optional code"
                    maxLength={30}
                  />
                </FormField>
              )}
              {dialog.level === "floor" && (
                <FormField label="Floor Level">
                  <Input
                    value={position}
                    onChange={(e) =>
                      setPosition(e.target.value.replace(/[^\d]/g, "").slice(0, 3))
                    }
                    placeholder="1, 2, 3…"
                    inputMode="numeric"
                  />
                </FormField>
              )}
              {dialog.level === "rack" && (
                <FormField label="Capacity">
                  <Input
                    value={capacity}
                    onChange={(e) =>
                      setCapacity(e.target.value.replace(/[^\d]/g, "").slice(0, 6))
                    }
                    placeholder="Max books"
                    inputMode="numeric"
                  />
                </FormField>
              )}
              {dialog.level === "shelf" && (
                <FormField label="Position">
                  <Input
                    value={position}
                    onChange={(e) =>
                      setPosition(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
                    }
                    placeholder="1, 2, 3…"
                    inputMode="numeric"
                  />
                </FormField>
              )}
              <div className="flex items-end">
                <Label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={status}
                    onCheckedChange={(v) => setStatus(Boolean(v))}
                  />
                  Active
                </Label>
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {dialog.id ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {deleteTarget ? LEVEL_LABELS[deleteTarget.level] : ""} "{deleteTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Soft-delete. Descendants remain but become unreachable through this parent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LevelColumn({
  level,
  parentId,
  selectedId,
  search,
  onSearch,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  inventoryByRack,
}: {
  level: Level;
  parentId: string | null;
  selectedId: string | null;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (n: Node) => void;
  onDelete: (n: Node) => void;
  onToggle: (n: Node) => void;
  inventoryByRack: Record<string, InventoryRow>;
}) {
  const { data = [], isLoading } = useQuery<Node[]>({
    queryKey: ["loc", level, parentId],
    queryFn: async () => {
      const fk = PARENT_FK[level];
      let q = supabase
        .from(TABLE[level])
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (fk && parentId && parentId !== "root") q = q.eq(fk, parentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Node[];
    },
    enabled: level === "campus" || (!!parentId && parentId !== "root"),
  });

  const filtered = search
    ? data.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()))
    : data;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {LEVEL_LABELS[level]}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={onAdd}
          aria-label={`Add ${LEVEL_LABELS[level]}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="border-b p-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search…"
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-2 text-center text-[11px] text-muted-foreground">
            {data.length === 0 ? "Empty — click + to add" : "No matches"}
          </p>
        ) : (
          filtered.map((n) => {
            const inv = level === "rack" ? inventoryByRack[n.id] : null;
            return (
              <div
                key={n.id}
                className={cn(
                  "group flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-muted",
                  selectedId === n.id && "bg-primary/10 text-primary",
                  !n.status && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(n.id)}
                  className="flex-1 truncate text-left"
                >
                  <div className="flex items-center gap-1 truncate font-medium">
                    <span className="truncate">{n.name}</span>
                    {!n.status && (
                      <span className="rounded bg-muted px-1 text-[9px] uppercase text-muted-foreground">
                        off
                      </span>
                    )}
                  </div>
                  {inv && (
                    <div className="text-[10px] text-muted-foreground">
                      {inv.current_count}/{inv.capacity} used · {inv.available} free
                    </div>
                  )}
                  {level === "rack" && !inv && n.capacity != null && (
                    <div className="text-[10px] text-muted-foreground">
                      Capacity: {n.capacity}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(n);
                  }}
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label={n.status ? "Deactivate" : "Activate"}
                  title={n.status ? "Deactivate" : "Activate"}
                >
                  <Power
                    className={cn(
                      "h-3 w-3",
                      n.status ? "text-emerald-500" : "text-muted-foreground",
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(n);
                  }}
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label="Edit"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(n);
                  }}
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
