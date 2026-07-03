import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface BookOption {
  id: string;
  collection_no: number;
  title: string;
  author?: string | null;
  isbn?: string | null;
  available_copies: number;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  books: BookOption[];
  placeholder?: string;
  disabled?: boolean;
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/25 rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function BookCombobox({ value, onChange, books, placeholder = "Select book", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(() => books.find((b) => b.id === value) || null, [books, value]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return books.slice(0, 100);
    return books
      .filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          (b.author ?? "").toLowerCase().includes(needle) ||
          (b.isbn ?? "").toLowerCase().includes(needle) ||
          String(b.collection_no).includes(needle),
      )
      .slice(0, 100);
  }, [books, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selected
              ? `#${selected.collection_no} — ${selected.title}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search by title, author, ISBN, coll. no…"
              value={q}
              onValueChange={setQ}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No books found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.id}
                  onSelect={() => {
                    onChange(b.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex items-start gap-2"
                >
                  <Check
                    className={cn(
                      "mt-1 h-4 w-4",
                      value === b.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col text-xs">
                    <span className="font-medium">
                      #{highlight(String(b.collection_no), q)} —{" "}
                      {highlight(b.title, q)}
                    </span>
                    <span className="text-muted-foreground">
                      {b.author ? <>by {highlight(b.author, q)} · </> : null}
                      ISBN {b.isbn ? highlight(b.isbn, q) : "-"} ·{" "}
                      {b.available_copies} available
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
