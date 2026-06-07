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
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";

import {
  listGavetaTemplates, upsertGavetaTemplate, deleteGavetaTemplate,
} from "@/lib/gaveta-templates.functions";
import {
  DEFAULT_CLASSICA, DEFAULT_FRENTE_INTEGRADA, DEFAULT_LEGRABOX,
  TIPO_LABEL, type GavetaTipo,
} from "@/lib/engines/gaveta-template";

export const Route = createFileRoute("/_authenticated/templates-gaveta")({ component: TemplatesGavetaPage });

const schema = z.object({
  nome: z.string().min(1, "Obrigatório"),
  tipo: z.enum(["classica", "frente_integrada", "legrabox"]),
  e_ilharga: z.coerce.number().min(1),
  e_traseira: z.coerce.number().min(1),
  e_fundo: z.coerce.number().min(0.5),
  profRasgo: z.coerce.number().min(1),
  distanciaFundo: z.coerce.number().min(0),
  e_frente: z.coerce.number().min(0).optional(),
  parafusosFrenteN: z.coerce.number().int().min(1).max(8).optional(),
  alturaIlharga: z.coerce.number().min(30).optional(),
});
type FormVals = z.infer<typeof schema>;

function defaultsFor(tipo: GavetaTipo, nome = ""): FormVals {
  if (tipo === "frente_integrada") return {
    nome, tipo, e_ilharga: DEFAULT_FRENTE_INTEGRADA.e_ilharga, e_traseira: DEFAULT_FRENTE_INTEGRADA.e_traseira,
    e_fundo: DEFAULT_FRENTE_INTEGRADA.e_fundo, profRasgo: DEFAULT_FRENTE_INTEGRADA.profRasgo,
    distanciaFundo: DEFAULT_FRENTE_INTEGRADA.distanciaFundo, parafusosFrenteN: DEFAULT_FRENTE_INTEGRADA.parafusosFrenteN,
  };
  if (tipo === "legrabox") return {
    nome, tipo, e_ilharga: DEFAULT_LEGRABOX.e_ilharga, e_traseira: DEFAULT_LEGRABOX.e_traseira,
    e_fundo: DEFAULT_LEGRABOX.e_fundo, profRasgo: DEFAULT_LEGRABOX.profRasgo,
    distanciaFundo: DEFAULT_LEGRABOX.distanciaFundo, alturaIlharga: DEFAULT_LEGRABOX.alturaIlharga,
    e_frente: DEFAULT_LEGRABOX.e_frente,
  };
  return {
    nome, tipo: "classica", e_ilharga: DEFAULT_CLASSICA.e_ilharga, e_frente: DEFAULT_CLASSICA.e_frente,
    e_traseira: DEFAULT_CLASSICA.e_traseira, e_fundo: DEFAULT_CLASSICA.e_fundo,
    profRasgo: DEFAULT_CLASSICA.profRasgo, distanciaFundo: DEFAULT_CLASSICA.distanciaFundo,
  };
}

function buildConfig(v: FormVals): Record<string, any> {
  if (v.tipo === "classica") return {
    e_ilharga: v.e_ilharga, e_frente: v.e_frente ?? 16, e_traseira: v.e_traseira, e_fundo: v.e_fundo,
    modoFundo: "rasgo", profRasgo: v.profRasgo, distanciaFundo: v.distanciaFundo,
    ilhargasCobrem: "frente_traseira",
  };
  if (v.tipo === "frente_integrada") return {
    e_ilharga: v.e_ilharga, e_traseira: v.e_traseira, e_fundo: v.e_fundo,
    modoFundo: "rasgo", profRasgo: v.profRasgo, distanciaFundo: v.distanciaFundo,
    parafusosFrenteN: v.parafusosFrenteN ?? 2,
  };
  return {
    e_ilharga: v.e_ilharga, alturaIlharga: v.alturaIlharga ?? 90, e_traseira: v.e_traseira,
    e_fundo: v.e_fundo, modoFundo: "rasgo", profRasgo: v.profRasgo,
    distanciaFundo: v.distanciaFundo, e_frente: v.e_frente ?? 16,
  };
}

function TemplatesGavetaPage() {
  const qc = useQueryClient();
  const list = useServerFn(listGavetaTemplates);
  const save = useServerFn(upsertGavetaTemplate);
  const del = useServerFn(deleteGavetaTemplate);

  const { data, isLoading } = useQuery({ queryKey: ["gaveta_templates"], queryFn: () => list() });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((t: any) =>
      [t.nome, TIPO_LABEL[t.tipo as GavetaTipo]].filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s)),
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultsFor("classica"),
  });
  const tipo = form.watch("tipo");

  function openNew() {
    setEditing(null);
    form.reset(defaultsFor("classica"));
    setOpen(true);
  }
  function openEdit(t: any) {
    setEditing(t);
    const base = defaultsFor(t.tipo as GavetaTipo, t.nome);
    const cfg = t.config ?? {};
    form.reset({ ...base, ...cfg, nome: t.nome, tipo: t.tipo });
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => save({ data: {
      id: editing?.id, values: { nome: v.nome, tipo: v.tipo, config: buildConfig(v) },
    } }),
    onSuccess: () => {
      toast.success(editing ? "Template atualizado" : "Template criado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["gaveta_templates"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Apagado"); setDelId(null);
      qc.invalidateQueries({ queryKey: ["gaveta_templates"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <CatalogShell
        title="Templates de Gaveta"
        subtitle="Métodos de construção da caixa de gaveta (clássica, frente integrada, Legrabox)."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados." : "Sem templates."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell><Badge variant="secondary">{TIPO_LABEL[t.tipo as GavetaTipo] ?? t.tipo}</Badge></TableCell>
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
              <Input {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => {
                const next = v as GavetaTipo;
                form.reset({ ...defaultsFor(next, form.getValues("nome")) });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classica">Caixa Clássica</SelectItem>
                  <SelectItem value="frente_integrada">Frente Integrada</SelectItem>
                  <SelectItem value="legrabox">Legrabox / Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Esp. ilharga</Label>
                <Input type="number" step={0.5} {...form.register("e_ilharga")} /></div>
              <div className="space-y-1.5"><Label>Esp. traseira</Label>
                <Input type="number" step={0.5} {...form.register("e_traseira")} /></div>
              {tipo !== "frente_integrada" && (
                <div className="space-y-1.5"><Label>Esp. frente</Label>
                  <Input type="number" step={0.5} {...form.register("e_frente")} /></div>
              )}
              <div className="space-y-1.5"><Label>Esp. fundo</Label>
                <Input type="number" step={0.5} {...form.register("e_fundo")} /></div>
              <div className="space-y-1.5"><Label>Prof. rasgo fundo</Label>
                <Input type="number" step={0.5} {...form.register("profRasgo")} /></div>
              <div className="space-y-1.5"><Label>Distância fundo ao bordo inf.</Label>
                <Input type="number" step={0.5} {...form.register("distanciaFundo")} /></div>
              {tipo === "frente_integrada" && (
                <div className="space-y-1.5"><Label>Nº parafusos / ilharga</Label>
                  <Input type="number" step={1} {...form.register("parafusosFrenteN")} /></div>
              )}
              {tipo === "legrabox" && (
                <div className="space-y-1.5"><Label>Altura ilharga (mm)</Label>
                  <Input type="number" step={1} {...form.register("alturaIlharga")} /></div>
              )}
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
