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
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { listMaterials, upsertMaterial, deleteMaterial } from "@/lib/catalog.functions";
import { ALLOWED_THICKNESSES_MM } from "@/lib/constants";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/materiais")({ component: MateriaisPage });

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  brand: z.string().min(1).default("Kronospan"),
  decor_code: z.string().optional(),
  thickness_mm: z.coerce.number().int(),
  sheet_width_mm: z.coerce.number().int().min(100),
  sheet_height_mm: z.coerce.number().int().min(100),
  price_per_sheet: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  has_grain: z.boolean().default(false),
});
type FormVals = z.infer<typeof schema>;

function MateriaisPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMaterials);
  const save = useServerFn(upsertMaterial);
  const del = useServerFn(deleteMaterial);

  const { data, isLoading } = useQuery({ queryKey: ["materials"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((m: any) =>
      [m.name, m.brand, m.decor_code].filter(Boolean).some((v: string) => v.toLowerCase().includes(s))
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", brand: "Kronospan", decor_code: "", thickness_mm: 19, sheet_width_mm: 2750, sheet_height_mm: 2070, price_per_sheet: "" as any, has_grain: false },
  });

  function openNew() {
    setEditing(null);
    form.reset({ name: "", brand: "Kronospan", decor_code: "", thickness_mm: 19, sheet_width_mm: 2750, sheet_height_mm: 2070, price_per_sheet: "" as any, has_grain: false });
    setOpen(true);
  }
  function openEdit(m: any) {
    setEditing(m);
    form.reset({
      name: m.name, brand: m.brand, decor_code: m.decor_code ?? "",
      thickness_mm: m.thickness_mm, sheet_width_mm: m.sheet_width_mm, sheet_height_mm: m.sheet_height_mm,
      price_per_sheet: m.price_per_sheet ?? ("" as any), has_grain: m.has_grain,
    });
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => save({ data: { id: editing?.id, values: {
      name: v.name, brand: v.brand,
      decor_code: v.decor_code || null,
      thickness_mm: v.thickness_mm,
      sheet_width_mm: v.sheet_width_mm, sheet_height_mm: v.sheet_height_mm,
      price_per_sheet: v.price_per_sheet === "" || v.price_per_sheet == null ? null : Number(v.price_per_sheet),
      has_grain: v.has_grain,
    } } }),
    onSuccess: () => { toast.success(editing ? "Material atualizado" : "Material criado"); setOpen(false); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Material apagado"); setDelId(null); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <CatalogShell
        title="Materiais"
        subtitle="Chapas e melaminas usadas nos projetos."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados para a pesquisa." : "Ainda não há materiais. Adicione o primeiro."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Código decor</TableHead>
              <TableHead className="text-right">Espessura</TableHead>
              <TableHead className="text-right">Dimensão chapa</TableHead>
              <TableHead className="text-right">Preço/chapa</TableHead>
              <TableHead>Veio</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.brand}</TableCell>
                <TableCell>{m.decor_code ?? "—"}</TableCell>
                <TableCell className="text-right tabular">{m.thickness_mm} mm</TableCell>
                <TableCell className="text-right tabular">{m.sheet_width_mm} × {m.sheet_height_mm} mm</TableCell>
                <TableCell className="text-right tabular">{fmtCurrency(m.price_per_sheet)}</TableCell>
                <TableCell>{m.has_grain ? "Sim" : "Não"}</TableCell>
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar material" : "Novo material"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Marca</Label><Input {...form.register("brand")} /></div>
              <div className="space-y-1.5"><Label>Código decor</Label><Input {...form.register("decor_code")} placeholder="K001 PE" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Espessura</Label>
              <Select value={String(form.watch("thickness_mm"))} onValueChange={(v) => form.setValue("thickness_mm", Number(v))}>
                <SelectTrigger className="tabular"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALLOWED_THICKNESSES_MM.map((t) => <SelectItem key={t} value={String(t)}>{t} mm</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Largura chapa (mm)</Label><Input type="number" className="tabular" {...form.register("sheet_width_mm")} /></div>
              <div className="space-y-1.5"><Label>Altura chapa (mm)</Label><Input type="number" className="tabular" {...form.register("sheet_height_mm")} /></div>
            </div>
            <div className="space-y-1.5"><Label>Preço por chapa (€)</Label><Input type="number" step="0.01" className="tabular" {...form.register("price_per_sheet")} /></div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label className="cursor-pointer">Tem veio?</Label><p className="text-xs text-muted-foreground">Direção de fibra a respeitar no corte.</p></div>
              <Switch checked={form.watch("has_grain")} onCheckedChange={(c) => form.setValue("has_grain", c)} />
            </div>
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
