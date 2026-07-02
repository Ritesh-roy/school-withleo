import { useCallback, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle2,
  FileWarning,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logActivity, todayISO } from "@/lib/helpers";
import {
  downloadSampleTemplate,
  exportFailedRows,
  markDuplicatesInDb,
  markDuplicatesInFile,
  normalizeIsbn,
  parseExcelFile,
  type ParsedRow,
} from "@/lib/excel-import";

const BATCH_SIZE = 200;

const MASTER_TYPES = [
  "book_type",
  "category",
  "author",
  "publisher",
  "language",
  "location",
] as const;

export function ExcelImportPanel() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(0);
  const [failed, setFailed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const validCount = rows.filter((r) => r.status === "valid").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const dupCount = rows.filter((r) => r.status === "duplicate").length;

  const handleFile = useCallback(async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error("Please upload an .xlsx or .xls file");
      return;
    }
    setParsing(true);
    setFileName(file.name);
    try {
      let parsed = await parseExcelFile(file);
      if (!parsed.length) {
        toast.error("No rows found in the file");
        setRows([]);
        return;
      }
      parsed = markDuplicatesInFile(parsed);

      // Fetch existing ISBNs from DB (only non-deleted) to flag DB-dupes.
      const isbns = parsed
        .map((r) => r.isbn)
        .filter((v) => !!v);
      if (isbns.length) {
        const { data: existing } = await supabase
          .from("books")
          .select("isbn")
          .eq("is_deleted", false)
          .in("isbn", isbns);
        const set = new Set(
          (existing ?? []).map((r) => normalizeIsbn(r.isbn)),
        );
        parsed = markDuplicatesInDb(parsed, set);
      }
      setRows(parsed);
      toast.success(`Parsed ${parsed.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }, []);

  const clearFile = () => {
    setRows([]);
    setFileName("");
    setProgress(0);
    setSuccess(0);
    setFailed(0);
    if (fileInput.current) fileInput.current.value = "";
  };

  const ensureMasters = async (validRows: ParsedRow[]) => {
    if (!autoCreate) return;
    // Fetch current masters once.
    const { data } = await supabase
      .from("library_masters")
      .select("name,master_type");
    const existing = new Set(
      (data ?? []).map((r) => `${r.master_type}::${r.name.toLowerCase()}`),
    );
    type MasterType = (typeof MASTER_TYPES)[number];
    const toCreate: { master_type: MasterType; name: string; status: boolean }[] = [];
    for (const r of validRows) {
      const map: Record<MasterType, string> = {
        book_type: r.bookType,
        category: r.category,
        author: r.author,
        publisher: r.publisher,
        language: r.language,
        location: r.location,
      };
      for (const t of MASTER_TYPES) {
        const val = map[t];
        if (!val) continue;
        const key = `${t}::${val.toLowerCase()}`;
        if (!existing.has(key)) {
          existing.add(key);
          toCreate.push({ master_type: t, name: val, status: true });
        }
      }
    }
    if (toCreate.length) {
      await supabase.from("library_masters").insert(toCreate);
    }
  };

  const runImport = async () => {
    if (!validCount) return toast.error("No valid rows to import");
    setImporting(true);
    setProgress(0);
    setSuccess(0);
    setFailed(0);
    const validRows = rows.filter((r) => r.status === "valid");
    try {
      await ensureMasters(validRows);
      let done = 0;
      let ok = 0;
      let bad = 0;
      const updated = [...rows];
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const chunk = validRows.slice(i, i + BATCH_SIZE);
        const payload = chunk.map((r) => ({
          title: r.title,
          collection_name: r.bookType,
          category: r.category,
          isbn: r.isbn || null,
          author: r.author || null,
          publisher: r.publisher || null,
          language: r.language || null,
          edition: r.edition || null,
          price: r.price ?? null,
          mrp: r.mrp ?? null,
          pages: r.pages ?? null,
          no_of_copies: r.copies,
          available_copies: r.copies,
          location: r.location || null,
          rack: r.rack || null,
          shelf: r.shelf || null,
          purchase_date: todayISO(),
        }));
        const { error } = await supabase.from("books").insert(payload);
        if (error) {
          // Fall back to per-row inserts to isolate failures.
          for (const r of chunk) {
            const one = payload[chunk.indexOf(r)];
            const res = await supabase.from("books").insert(one);
            if (res.error) {
              bad++;
              const idx = updated.findIndex((x) => x.index === r.index);
              if (idx >= 0)
                updated[idx] = {
                  ...updated[idx],
                  status: "invalid",
                  errors: [...updated[idx].errors, res.error.message],
                };
            } else ok++;
          }
        } else {
          ok += chunk.length;
        }
        done += chunk.length;
        setProgress(Math.round((done / validRows.length) * 100));
        setSuccess(ok);
        setFailed(bad);
      }
      setRows(updated);
      await logActivity("Bulk import books", `${ok} added, ${bad} failed`);
      qc.invalidateQueries({ queryKey: ["books-bulk"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      setShowSummary(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Import Books from Excel
          </h3>
          <p className="text-xs text-muted-foreground">
            Upload .xlsx or .xls. Rows are validated, duplicates blocked, and imported in batches of {BATCH_SIZE}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSampleTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {!rows.length ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileInput.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50",
          )}
        >
          {parsing ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {parsing ? "Parsing…" : "Drag & drop Excel file here, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supported: .xlsx, .xls · Max ~10,000 rows recommended
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <FileSpreadsheet className="h-3 w-3" /> {fileName}
            </Badge>
            <Badge className="gap-1 bg-emerald-600/15 text-emerald-600 hover:bg-emerald-600/15">
              <CheckCircle2 className="h-3 w-3" /> {validCount} valid
            </Badge>
            {invalidCount > 0 && (
              <Badge className="gap-1 bg-destructive/15 text-destructive hover:bg-destructive/15">
                <AlertCircle className="h-3 w-3" /> {invalidCount} invalid
              </Badge>
            )}
            {dupCount > 0 && (
              <Badge className="gap-1 bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">
                <FileWarning className="h-3 w-3" /> {dupCount} duplicate
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-create"
                  checked={autoCreate}
                  onCheckedChange={(v) => setAutoCreate(Boolean(v))}
                  disabled={importing}
                />
                <Label htmlFor="auto-create" className="text-xs">
                  Auto-create missing masters
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFile}
                disabled={importing}
              >
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
              {(invalidCount > 0 || dupCount > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportFailedRows(rows)}
                  disabled={importing}
                >
                  <Download className="mr-1 h-4 w-4" /> Failed
                </Button>
              )}
              <Button
                size="sm"
                onClick={runImport}
                disabled={importing || !validCount}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Import {validCount} {validCount === 1 ? "row" : "rows"}
              </Button>
            </div>
          </div>

          {importing && (
            <div className="mb-3">
              <Progress value={progress} />
              <p className="mt-1 text-xs text-muted-foreground">
                {progress}% — {success} succeeded, {failed} failed
              </p>
            </div>
          )}

          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 500).map((r) => (
                  <TableRow
                    key={r.index}
                    className={cn(
                      r.status === "invalid" && "bg-destructive/5",
                      r.status === "duplicate" && "bg-amber-500/5",
                    )}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {r.index}
                    </TableCell>
                    <TableCell className="font-medium">{r.title || "—"}</TableCell>
                    <TableCell className="text-xs">{r.isbn || "—"}</TableCell>
                    <TableCell className="text-xs">{r.category || "—"}</TableCell>
                    <TableCell className="text-xs">{r.copies}</TableCell>
                    <TableCell className="text-xs">
                      {r.status === "valid" ? (
                        <span className="text-emerald-600">Valid</span>
                      ) : (
                        <span
                          className={cn(
                            r.status === "duplicate"
                              ? "text-amber-600"
                              : "text-destructive",
                          )}
                        >
                          {r.errors.join("; ")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 500 && (
              <p className="p-2 text-center text-xs text-muted-foreground">
                Showing first 500 of {rows.length} rows.
              </p>
            )}
          </div>
        </>
      )}

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription>
              {success} books added, {failed} failed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-semibold text-emerald-600">{success}</div>
              <div className="text-xs text-muted-foreground">Succeeded</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-semibold text-destructive">{failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-semibold">{rows.length}</div>
              <div className="text-xs text-muted-foreground">Total rows</div>
            </div>
          </div>
          <DialogFooter>
            {failed > 0 && (
              <Button variant="outline" onClick={() => exportFailedRows(rows)}>
                <Download className="mr-2 h-4 w-4" /> Export failed
              </Button>
            )}
            <Button
              onClick={() => {
                setShowSummary(false);
                clearFile();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
