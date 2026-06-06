import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Trash2, Star, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import {
  listTemplates, upsertTemplate, deleteTemplate, setDefaultTemplate,
  seedBrocasPadrao, SISTEMAS_UNIAO, SISTEMA_LABELS, DEFAULT_TEMPLATE_CONFIG,
} from "@/lib/drilling.functions";
import { listDrillBits } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/templates-furacao")({ component: TemplatesPage });

const schema = z.object({
  name: z.string().min(1, "Obrigatório"),
  is_default: z.boolean(),
  sistemaUniao: z.enum(SISTEMAS_UNIAO),
  broca_cavilha: z.string().optional(),
  broca_minifix_corpo: z.string().optional(),
  broca_minifix_perno: z.string().optional(),
  broca_parafuso: z.string().optional(),
  broca_dobradica: z.string().optional(),
  recuo_extremidade: z.coerce.number().min(0),
  espacamento_sistema: z.coerce.number().min(1),
  recuo_frontal: z.coerce.number().min(0),
  conectores_min: z.coerce.number().int().min(1),
  conectores_por_mm: z.coerce.number().int().min(50),
  prof_cavilha: z.coerce.number().min(1),
  prof_minifix: z.coerce.number().min(1),
  diam_cavilha: z.coerce.number().min(1),
  diam_parafuso: z.coerce.number().min(1),
});
type FormVals = z.infer<typeof schema>;

const NONE = "__none__";

function defaultsFromConfig(name = "", is_default = false, cfg = DEFAULT_TEMPLATE_CONFIG): FormVals {
  return {
    name,
    is_default,
    sistemaUniao: cfg.sistemaUniao,
    broca_cavilha: cfg.brocas.cavilha ?? NONE,
    broca_minifix_corpo: cfg.brocas.minifix_corpo ?? NONE,
    broca_minifix_perno: cfg.brocas.minifix_perno ?? NONE,
    broca_parafuso: cfg.brocas.parafuso ?? NONE,
    broca_dobradica: cfg.brocas.dobradica ?? NONE,
    ...cfg.regras,
  };
}

function TemplatesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTemplates);
  const listBits = useServerFn(listDrillBits);
  const save = useServerFn(upsertTemplate);
  const del = useServerFn(deleteTemplate);
  const setDef = useServerFn(setDefaultTemplate);
  const seed = useServerFn(seedBrocasPadrao);

  const { data, isLoading } = useQuery({ queryKey: ["drilling_templates"], queryFn: () => list() });
  const { data: bits } = useQuery({ queryKey: ["drill_bits"], queryFn: () => listBits() });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((t: any) =>
      [t.name, SISTEMA_LABELS[t.config?.sistemaUniao]].filter(Boolean).some((v: string) => v.toLowerCase().includes(s))
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultsFromConfig(),
  });

  function openNew() {
    setEditing(null);
    form.reset(defaultsFromConfig());
    setOpen(true);
  }
  function openEdit(t: any) {
    setEditing(t);
    const cfg = { ...DEFAULT_TEMPLATE_CONFIG, ...(t.config ?? {}),
      brocas: { ...DEFAULT_TEMPLATE_CONFIG.brocas, ...(t.config?.brocas ?? {}) },
      regras: { ...DEFAULT_TEMPLATE_CONFIG.regras, ...(t.config?.regras ?? {}) } };
    form.reset(defaultsFromConfig(t.name, t.is_default, cfg));
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => {
      const norm = (s?: string) => (s && s !== NONE ? s : null);
      return save({ data: { id: editing?.id, values: {
        name: v.name,
        is_default: v.is_default,
        config: {
          sistemaUniao: v.sistemaUniao,
          brocas: {
            cavilha: norm(v.broca_cavilha),
            minifix_corpo: norm(v.broca_minifix_corpo),
            minifix_perno: norm(v.broca_minifix_perno),
            parafuso: norm(v.broca_parafuso),
            dobradica: norm(v.broca_dobradica),
          },
          regras: {
            recuo_extremidade: Number(v.recuo_extremidade),
            espacamento_sistema: Number(v.espacamento_sistema),
            recuo_frontal: Number(v.recuo_frontal),
            conectores_min: Number(v.conectores_min),
            conectores_por_mm: Number(v.conectores_por_mm),
            prof_cavilha: Number(v.prof_cavilha),
            prof_minifix: Number(v.prof_minifix),
            diam_cavilha: Number(v.diam_cavilha),
            diam_parafuso: Number(v.diam_parafuso),
          },
        },
      } } });
    },
    onSuccess: () => {
      toast.success(editing ? "Template atualizado" : "Template criado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["drilling_templates"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Template apagado"); setDelId(null); qc.invalidateQueries({ queryKey: ["drilling_templates"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const defMut = useMutation({
    mutationFn: async (id: string) => setDef({ data: { id } }),
    onSuccess: () => { toast.success("Template padrão atualizado"); qc.invalidateQueries({ queryKey: ["drilling_templates"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const seedMut = useMutation({
    mutationFn: async () => seed(),
    onSuccess: (r: any) => {
      toast.success(r.inserted > 0 ? `Adicionadas ${r.inserted} brocas padrão` : "Brocas padrão já existiam");
      qc.invalidateQueries({ queryKey: ["drill_bits"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const sistema = form.watch("sistemaUniao");
  const usaMinifix = sistema === "minifix_cavilha";
  const usaCavilha = sistema !== "parafuso_direto";
  const usaParafuso = sistema !== "minifix_cavilha";

  function BrocaSelect({ name, label, purposes }: { name: keyof FormVals; label: string; purposes: string[] }) {
    const opts = (bits ?? []).filter((b: any) => purposes.includes(b.purpose));
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select value={(form.watch(name) as string) ?? NONE} onValueChange={(v) => form.setValue(name, v as any)}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {opts.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({Number(b.diameter_mm)}mm)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <>
      <CatalogShell
        title="Templates de Furação"
        subtitle="Regras universais de união e furação, partilhadas pelos módulos."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados para a pesquisa." : "Ainda não há templates. Crie o primeiro."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Sistema de união</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{SISTEMA_LABELS[t.config?.sistemaUniao] ?? "—"}</TableCell>
                <TableCell>
                  {t.is_default
                    ? <Badge variant="default" className="gap-1"><Star className="h-3 w-3" /> Padrão</Badge>
                    : <Button variant="ghost" size="sm" onClick={() => defMut.mutate(t.id)}>Marcar padrão</Button>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDelId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CatalogShell>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar template" : "Novo template"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Template padrão</Label>
                <p className="text-xs text-muted-foreground">Apenas um template por utilizador.</p>
              </div>
              <Switch checked={form.watch("is_default")} onCheckedChange={(v) => form.setValue("is_default", v)} />
            </div>

            <div className="space-y-1.5">
              <Label>Sistema de união</Label>
              <Select value={form.watch("sistemaUniao")} onValueChange={(v) => form.setValue("sistemaUniao", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SISTEMAS_UNIAO.map((s) => <SelectItem key={s} value={s}>{SISTEMA_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Atribuição de brocas</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> Brocas padrão
                </Button>
              </div>
              {usaCavilha && <BrocaSelect name="broca_cavilha" label="Furo de cavilha" purposes={["cavilha"]} />}
              {usaMinifix && <BrocaSelect name="broca_minifix_corpo" label="Furo de corpo de minifix" purposes={["minifix"]} />}
              {usaMinifix && <BrocaSelect name="broca_minifix_perno" label="Furo de perno de minifix" purposes={["minifix"]} />}
              {usaParafuso && <BrocaSelect name="broca_parafuso" label="Pré-furo de parafuso" purposes={["parafuso"]} />}
              <BrocaSelect name="broca_dobradica" label="Furo de dobradiça" purposes={["geral"]} />
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Regras universais (mm)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Recuo extremidade</Label><Input type="number" className="tabular" {...form.register("recuo_extremidade")} /></div>
                <div className="space-y-1.5"><Label>Espaçamento sistema 32</Label><Input type="number" className="tabular" {...form.register("espacamento_sistema")} /></div>
                <div className="space-y-1.5"><Label>Recuo frontal</Label><Input type="number" className="tabular" {...form.register("recuo_frontal")} /></div>
                <div className="space-y-1.5"><Label>Nº mín. conectores/junta</Label><Input type="number" className="tabular" {...form.register("conectores_min")} /></div>
                <div className="space-y-1.5"><Label>1 conector a cada (mm)</Label><Input type="number" className="tabular" {...form.register("conectores_por_mm")} /></div>
                <div className="space-y-1.5"><Label>Profundidade cavilha</Label><Input type="number" className="tabular" {...form.register("prof_cavilha")} /></div>
                <div className="space-y-1.5"><Label>Profundidade minifix (corpo)</Label><Input type="number" className="tabular" {...form.register("prof_minifix")} /></div>
                <div className="space-y-1.5"><Label>Diâmetro cavilha</Label><Input type="number" className="tabular" {...form.register("diam_cavilha")} /></div>
                <div className="space-y-1.5"><Label>Diâmetro pré-furo parafuso</Label><Input type="number" className="tabular" {...form.register("diam_parafuso")} /></div>
              </div>
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
