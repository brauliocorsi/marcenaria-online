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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { listHardware, upsertHardware, deleteHardware, seedCorredicasPadrao, HARDWARE_CATEGORIES, PRICING_UNITS } from "@/lib/catalog.functions";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ferragens")({ component: FerragensPage });

const CATEGORY_LABELS: Record<string, string> = {
  minifix: "Minifix", cavilha: "Cavilha", parafuso: "Parafuso",
  dobradica: "Dobradiça", corredica: "Corrediça", pe: "Pé",
  perfil_aluminio: "Perfil de alumínio", led: "LED", outro: "Outro",
};
const UNIT_LABELS: Record<string, string> = { unidade: "Unidade", metro: "Metro" };

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  category: z.enum(HARDWARE_CATEGORIES as any),
  reference: z.string().optional(),
  pricing_unit: z.enum(PRICING_UNITS as any),
  price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  params: z.record(z.string(), z.any()),
});
type FormVals = z.infer<typeof schema>;

function FerragensPage() {
  const qc = useQueryClient();
  const list = useServerFn(listHardware);
  const save = useServerFn(upsertHardware);
  const del = useServerFn(deleteHardware);

  const { data, isLoading } = useQuery({ queryKey: ["hardware"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((m: any) =>
      [m.name, m.reference, CATEGORY_LABELS[m.category]].filter(Boolean).some((v: string) => v.toLowerCase().includes(s))
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", category: "minifix", reference: "", pricing_unit: "unidade", price: "" as any, params: {} },
  });
  const category = form.watch("category");
  const params = form.watch("params") || {};

  function setParam(k: string, v: any) {
    form.setValue("params", { ...form.getValues("params"), [k]: v });
  }

  function openNew() {
    setEditing(null);
    form.reset({ name: "", category: "minifix", reference: "", pricing_unit: "unidade", price: "" as any, params: {} });
    setOpen(true);
  }
  function openEdit(m: any) {
    setEditing(m);
    form.reset({
      name: m.name, category: m.category, reference: m.reference ?? "",
      pricing_unit: m.pricing_unit, price: (m.price ?? "") as any, params: m.params || {},
    });
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => save({ data: { id: editing?.id, values: {
      name: v.name, category: v.category, reference: v.reference || null,
      pricing_unit: v.pricing_unit,
      price: v.price === "" || v.price == null ? null : Number(v.price),
      params: v.params || {},
    } } }),
    onSuccess: () => { toast.success(editing ? "Ferragem atualizada" : "Ferragem criada"); setOpen(false); qc.invalidateQueries({ queryKey: ["hardware"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Ferragem apagada"); setDelId(null); qc.invalidateQueries({ queryKey: ["hardware"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const seed = useServerFn(seedCorredicasPadrao);
  const seedMut = useMutation({
    mutationFn: async () => seed(),
    onSuccess: (r: any) => {
      toast.success(`Corrediças padrão: ${r.inserted} adicionadas, ${r.skipped} já existiam.`);
      qc.invalidateQueries({ queryKey: ["hardware"] });
    },
    onError: (e: Error) => toast.error("Erro no seeder", { description: e.message }),
  });

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
          {seedMut.isPending ? "A adicionar…" : "Adicionar corrediças padrão"}
        </Button>
      </div>
      <CatalogShell
        title="Ferragens"
        subtitle="Minifix, cavilhas, dobradiças, corrediças, pés, perfis e iluminação."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados para a pesquisa." : "Ainda não há ferragens. Adicione a primeira."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>{CATEGORY_LABELS[m.category]}</TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.reference ?? "—"}</TableCell>
                <TableCell>{UNIT_LABELS[m.pricing_unit]}</TableCell>
                <TableCell className="text-right tabular">{fmtCurrency(m.price)}{m.pricing_unit === "metro" ? "/m" : ""}</TableCell>
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
          <SheetHeader><SheetTitle>{editing ? "Editar ferragem" : "Nova ferragem"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => { form.setValue("category", v as any); form.setValue("params", {}); if (v === "perfil_aluminio" || v === "led") form.setValue("pricing_unit", "metro"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HARDWARE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unidade de preço</Label>
                <Select value={form.watch("pricing_unit")} onValueChange={(v) => form.setValue("pricing_unit", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_UNITS.map((u) => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Nome *</Label><Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Referência</Label><Input {...form.register("reference")} /></div>
              <div className="space-y-1.5"><Label>Preço (€)</Label><Input type="number" step="0.01" className="tabular" {...form.register("price")} /></div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h3 className="text-sm font-semibold">Especificações</h3>
              <CategoryParams category={category} params={params} setParam={setParam} />
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

function NumInput({ value, onChange, placeholder, step }: { value: any; onChange: (v: any) => void; placeholder?: string; step?: string }) {
  return <Input type="number" step={step ?? "1"} className="tabular" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} placeholder={placeholder} />;
}

function CategoryParams({ category, params, setParam }: { category: string; params: any; setParam: (k: string, v: any) => void }) {
  switch (category) {
    case "minifix":
    case "cavilha":
    case "parafuso":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Diâmetro (mm)</Label><NumInput step="0.1" value={params.diametro_mm} onChange={(v) => setParam("diametro_mm", v)} /></div>
          <div className="space-y-1.5"><Label>Comprimento (mm)</Label><NumInput value={params.comprimento_mm} onChange={(v) => setParam("comprimento_mm", v)} /></div>
        </div>
      );
    case "dobradica":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Ângulo de abertura (°)</Label><NumInput value={params.angulo} onChange={(v) => setParam("angulo", v)} placeholder="110, 165…" /></div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={params.tipo ?? ""} onValueChange={(v) => setParam("tipo", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reta">Reta</SelectItem>
                <SelectItem value="curva">Curva</SelectItem>
                <SelectItem value="super_curva">Super-curva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    case "corredica":
      return <CorredicaParams params={params} setParam={setParam} />;
    case "pe":
      return (
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5"><Label>Altura (mm)</Label><NumInput value={params.altura_mm} onChange={(v) => setParam("altura_mm", v)} placeholder="100, 150…" /></div>
          <div className="flex items-center justify-between rounded-md border bg-card p-2">
            <Label className="cursor-pointer text-xs">Regulável</Label>
            <Switch checked={!!params.regulavel} onCheckedChange={(c) => setParam("regulavel", c)} />
          </div>
        </div>
      );
    case "perfil_aluminio":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Comprimento (mm)</Label><NumInput value={params.comprimento_mm} onChange={(v) => setParam("comprimento_mm", v)} placeholder="2500, 3000…" /></div>
          <div className="space-y-1.5"><Label>Acabamento</Label><Input value={params.acabamento ?? ""} onChange={(e) => setParam("acabamento", e.target.value)} placeholder="Anodizado, preto…" /></div>
        </div>
      );
    case "led":
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Tensão (V)</Label><NumInput value={params.tensao_v} onChange={(v) => setParam("tensao_v", v)} placeholder="12, 24" /></div>
          <div className="space-y-1.5"><Label>Potência (W/m)</Label><NumInput step="0.1" value={params.potencia_wm} onChange={(v) => setParam("potencia_wm", v)} /></div>
          <div className="space-y-1.5"><Label>Temp. cor (K)</Label><NumInput value={params.temp_cor_k} onChange={(v) => setParam("temp_cor_k", v)} placeholder="3000, 4000" /></div>
        </div>
      );
    case "outro":
      return (
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Textarea value={params.notas ?? ""} onChange={(e) => setParam("notas", e.target.value)} rows={3} />
        </div>
      );
    default:
      return null;
  }
}
