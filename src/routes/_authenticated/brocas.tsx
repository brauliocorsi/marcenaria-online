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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { listDrillBits, upsertDrillBit, deleteDrillBit, DRILL_PURPOSES } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/brocas")({ component: BrocasPage });

const PURPOSE_LABELS: Record<string, string> = {
  parafuso: "Parafuso", cavilha: "Cavilha", minifix: "Minifix", geral: "Geral",
};

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  diameter_mm: z.coerce.number().min(0.1).max(100),
  purpose: z.enum(DRILL_PURPOSES as any),
  max_depth_mm: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
});
type FormVals = z.infer<typeof schema>;

function BrocasPage() {
  const qc = useQueryClient();
  const list = useServerFn(listDrillBits);
  const save = useServerFn(upsertDrillBit);
  const del = useServerFn(deleteDrillBit);

  const { data, isLoading } = useQuery({ queryKey: ["drill_bits"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((m: any) =>
      [m.name, PURPOSE_LABELS[m.purpose]].filter(Boolean).some((v: string) => v.toLowerCase().includes(s))
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", diameter_mm: 5, purpose: "geral", max_depth_mm: "" as any },
  });

  function openNew() {
    setEditing(null);
    form.reset({ name: "", diameter_mm: 5, purpose: "geral", max_depth_mm: "" as any });
    setOpen(true);
  }
  function openEdit(m: any) {
    setEditing(m);
    form.reset({
      name: m.name, diameter_mm: Number(m.diameter_mm), purpose: m.purpose,
      max_depth_mm: (m.max_depth_mm ?? "") as any,
    });
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => save({ data: { id: editing?.id, values: {
      name: v.name, diameter_mm: Number(v.diameter_mm), purpose: v.purpose,
      max_depth_mm: v.max_depth_mm === "" || v.max_depth_mm == null ? null : Number(v.max_depth_mm),
    } } }),
    onSuccess: () => { toast.success(editing ? "Broca atualizada" : "Broca criada"); setOpen(false); qc.invalidateQueries({ queryKey: ["drill_bits"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Broca apagada"); setDelId(null); qc.invalidateQueries({ queryKey: ["drill_bits"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <CatalogShell
        title="Brocas"
        subtitle="Diâmetros, finalidades e profundidades para furação."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados para a pesquisa." : "Ainda não há brocas. Adicione a primeira."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Diâmetro</TableHead>
              <TableHead>Finalidade</TableHead>
              <TableHead className="text-right">Profundidade máx.</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-right tabular">{Number(m.diameter_mm)} mm</TableCell>
                <TableCell>{PURPOSE_LABELS[m.purpose]}</TableCell>
                <TableCell className="text-right tabular">{m.max_depth_mm ? `${m.max_depth_mm} mm` : "—"}</TableCell>
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
          <SheetHeader><SheetTitle>{editing ? "Editar broca" : "Nova broca"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Diâmetro (mm)</Label><Input type="number" step="0.1" className="tabular" {...form.register("diameter_mm")} /></div>
              <div className="space-y-1.5">
                <Label>Finalidade</Label>
                <Select value={form.watch("purpose")} onValueChange={(v) => form.setValue("purpose", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DRILL_PURPOSES.map((p) => <SelectItem key={p} value={p}>{PURPOSE_LABELS[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Profundidade máx. (mm)</Label><Input type="number" className="tabular" {...form.register("max_depth_mm")} /></div>
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
