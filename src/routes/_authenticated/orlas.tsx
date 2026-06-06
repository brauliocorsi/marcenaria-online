import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { listEdgeBands, upsertEdgeBand, deleteEdgeBand } from "@/lib/catalog.functions";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orlas")({ component: OrlasPage });

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  color: z.string().optional(),
  thickness_mm: z.coerce.number().min(0.1).max(10),
  width_mm: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  price_per_meter: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
});
type FormVals = z.infer<typeof schema>;

function OrlasPage() {
  const qc = useQueryClient();
  const list = useServerFn(listEdgeBands);
  const save = useServerFn(upsertEdgeBand);
  const del = useServerFn(deleteEdgeBand);

  const { data, isLoading } = useQuery({ queryKey: ["edge_bands"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((m: any) =>
      [m.name, m.color].filter(Boolean).some((v: string) => v.toLowerCase().includes(s))
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: "", thickness_mm: 0.8, width_mm: 22 as any, price_per_meter: "" as any },
  });

  function openNew() {
    setEditing(null);
    form.reset({ name: "", color: "", thickness_mm: 0.8, width_mm: 22 as any, price_per_meter: "" as any });
    setOpen(true);
  }
  function openEdit(m: any) {
    setEditing(m);
    form.reset({
      name: m.name, color: m.color ?? "",
      thickness_mm: Number(m.thickness_mm),
      width_mm: (m.width_mm ?? "") as any,
      price_per_meter: (m.price_per_meter ?? "") as any,
    });
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => save({ data: { id: editing?.id, values: {
      name: v.name, color: v.color || null,
      thickness_mm: Number(v.thickness_mm),
      width_mm: v.width_mm === "" || v.width_mm == null ? null : Number(v.width_mm),
      price_per_meter: v.price_per_meter === "" || v.price_per_meter == null ? null : Number(v.price_per_meter),
    } } }),
    onSuccess: () => { toast.success(editing ? "Orla atualizada" : "Orla criada"); setOpen(false); qc.invalidateQueries({ queryKey: ["edge_bands"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Orla apagada"); setDelId(null); qc.invalidateQueries({ queryKey: ["edge_bands"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <CatalogShell
        title="Orlas"
        subtitle="Fitas de bordo para acabamento de cantos."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados para a pesquisa." : "Ainda não há orlas. Adicione a primeira."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead className="text-right">Espessura</TableHead>
              <TableHead className="text-right">Largura</TableHead>
              <TableHead className="text-right">Preço/metro</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.color ?? "—"}</TableCell>
                <TableCell className="text-right tabular">{Number(m.thickness_mm)} mm</TableCell>
                <TableCell className="text-right tabular">{m.width_mm ? `${m.width_mm} mm` : "—"}</TableCell>
                <TableCell className="text-right tabular">{fmtCurrency(m.price_per_meter)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDelId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CatalogShell>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar orla" : "Nova orla"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Cor</Label><Input {...form.register("color")} placeholder="Branco, Carvalho…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Espessura (mm)</Label><Input type="number" step="0.1" className="tabular" {...form.register("thickness_mm")} /></div>
              <div className="space-y-1.5"><Label>Largura (mm)</Label><Input type="number" className="tabular" {...form.register("width_mm")} /></div>
            </div>
            <div className="space-y-1.5"><Label>Preço por metro (€)</Label><Input type="number" step="0.01" className="tabular" {...form.register("price_per_meter")} /></div>
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "A guardar…" : "Guardar"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDelete open={!!delId} onOpenChange={(o) => !o && setDelId(null)} onConfirm={() => delId && delMut.mutate(delId)} />
    </>
  );
}
