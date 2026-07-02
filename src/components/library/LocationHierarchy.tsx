import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/library/FormField";
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
// Uses the existing Postgres tables. UI is a column-cascading picker with
// per-level CRUD and rack capacity/usage display from the rack_inventory view.

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

  const [editing, setEditing] = useState<{ level: Level; id: string | null } | null>(null);
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
    // Clear descendants when parent changes.
    const idx = LEVELS.indexOf(level);
    for (let i = idx + 1; i < LEVELS.length; i++) next[LEVELS[i]] = null;
    setSelected(next);
    resetForm(level);
  };

  const resetForm = (level?: Level) => {
    setEditing(level ? { level, id: null } : null);
    setName("");
    setCode("");
    setCapacity("");
    setPosition("");
    setStatus(true);
  };

  const openEdit = (level: Level, node: Node) => {
    setEditing({ level, id: node.id });
    setName(node.name);
    setCode(node.code ?? "");
    setCapacity(node.capacity != null ? String(node.capacity) : "");
    setPosition(node.position != null ? String(node.position) : node.level_no != null ? String(node.level_no) : "");
    setStatus(node.status);
  };

  const save = async () => {
    if (!editing) return;
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Name is required");
    const level = editing.level;
    const parentFk = PARENT_FK[level];
    const parentId = parentFk ? selected[PARENT_LEVEL[level]!] : null;
    if (parentFk && !parentId)
      return toast.error(`Select a ${LEVEL_LABELS[PARENT_LEVEL[level]!]} first`);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: trimmed,
        status,
      };
      if (level !== "shelf") payload.code = code.trim() || null;
      if (level === "rack")
        payload.capacity = capacity ? Math.max(0, parseInt(capacity)) : 0;
      if (level === "floor")
        payload.level_no = position ? parseInt(position) : null;
      if (level === "shelf")
        payload.position = position ? parseInt(position) : null;
      if (parentFk) payload[parentFk] = parentId;

      if (editing.id) {
        const { error } = await supabase
          .from(TABLE[level])
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success(`${LEVEL_LABELS[level]} updated`);
        logActivity(`Update ${level}`, trimmed);
      } else {
        const { error } = await supabase.from(TABLE[level]).insert(payload);
        if (error) throw error;
        toast.success(`${LEVEL_LABELS[level]} added`);
        logActivity(`Add ${level}`, trimmed);
      }
      resetForm(level);
      qc.invalidateQueries({ queryKey: ["loc", level] });
      qc.invalidateQueries({ queryKey: ["rack-inventory"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
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
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
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
              onSelect={(id) => selectLevel(level, id)}
              onNew={() => resetForm(level)}
              onEdit={(n) => openEdit(level, n)}
              onDelete={(n) => setDeleteTarget({ level, id: n.id, name: n.name })}
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

      {editing && (
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h4 className="mb-3 text-sm font-semibold">
            {editing.id ? "Edit" : "Add"} {LEVEL_LABELS[editing.level]}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${LEVEL_LABELS[editing.level]} name`}
                maxLength={80}
              />
            </FormField>
            {editing.level !== "shelf" && (
              <FormField label="Code">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Optional code"
                  maxLength={30}
                />
              </FormField>
            )}
            {editing.level === "floor" && (
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
            {editing.level === "rack" && (
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
            {editing.level === "shelf" && (
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
            <div className="flex items-end gap-2">
              <Label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={status}
                  onCheckedChange={(v) => setStatus(Boolean(v))}
                />
                Active
              </Label>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => resetForm()} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editing.id ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}

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
  onSelect,
  onNew,
  onEdit,
  onDelete,
  inventoryByRack,
}: {
  level: Level;
  parentId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onEdit: (n: Node) => void;
  onDelete: (n: Node) => void;
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

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {LEVEL_LABELS[level]}
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onNew}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="p-2 text-center text-[11px] text-muted-foreground">
            Empty — click + to add
          </p>
        ) : (
          data.map((n) => {
            const inv = level === "rack" ? inventoryByRack[n.id] : null;
            return (
              <div
                key={n.id}
                className={cn(
                  "group flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-muted",
                  selectedId === n.id && "bg-primary/10 text-primary",
                )}
              >
                <button
                  onClick={() => onSelect(n.id)}
                  className="flex-1 truncate text-left"
                >
                  <div className="truncate font-medium">{n.name}</div>
                  {inv && (
                    <div className="text-[10px] text-muted-foreground">
                      {inv.used}/{inv.capacity} used · {inv.available} free
                    </div>
                  )}
                  {level === "rack" && !inv && n.capacity != null && (
                    <div className="text-[10px] text-muted-foreground">
                      Capacity: {n.capacity}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => onEdit(n)}
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label="Edit"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
                <button
                  onClick={() => onDelete(n)}
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
