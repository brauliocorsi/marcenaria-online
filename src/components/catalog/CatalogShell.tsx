import { ReactNode } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  title: string;
  subtitle?: string;
  search: string;
  onSearch: (v: string) => void;
  onAdd: () => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export function CatalogShell({ title, subtitle, search, onSearch, onAdd, isLoading, isEmpty, emptyText, children }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Pesquisar…"
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {emptyText ?? "Ainda não existem registos. Adicione o primeiro."}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
