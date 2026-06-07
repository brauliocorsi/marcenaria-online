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

import { listPuxadores, upsertPuxador, deletePuxador } from "@/lib/puxadores.functions";
import { PUXADOR_TIPO_LABEL, type PuxadorTipo } from "@/lib/engines/puxadores";

export const Route = createFileRoute("/_authenticated/puxadores")({ component: PuxadoresPage });

const schema = z.object({
  nome: z.string().min(1, "Obrigatório"),
  tipo: z.enum(["convencional", "cava", "gola_j", "gola_c"]),
  fabricante: z.string().optional(),
  subtipo: z.enum(["barra", "botao"]).optional(),
  entreEixo: z.coerce.number().min(16).optional(),
  furoO: z.coerce.number().min(2).optional(),
  alturaDoBordo: z.coerce.number().min(0).optional(),
  cavaLargura: z.coerce.number().min(5).optional(),
  deixarEspessura: z.coerce.number().min(1).optional(),
  reveal: z.coerce.number().min(10).optional(),
  perfilLargura: z.coerce.number().min(5).optional(),
  perfilProf: z.coerce.number().min(5).optional(),
});
type FormVals = z.infer<typeof schema>;

function defaultsFor(tipo: PuxadorTipo, nome = ""): FormVals {
  if (tipo === "convencional") return { nome, tipo, subtipo: "barra", entreEixo: 128, furoO: 5, alturaDoBordo: 50 };
  if (tipo === "cava") return { nome, tipo, cavaLargura: 30, deixarEspessura: 8 };
  return { nome, tipo, reveal: 40, perfilLargura: 20, perfilProf: tipo === "gola_c" ? 24 : 20 };
}

function buildConfig(v: FormVals): Record<string, any> {
  if (v.tipo === "convencional") {
    if (v.subtipo === "botao") return { subtipo: "botao", furoØ: v.furoO ?? 5, alturaDoBordo: v.alturaDoBordo ?? 50 };
    return { subtipo: "barra", entreEixo: v.entreEixo ?? 128, furoØ: v.furoO ?? 5, alturaDoBordo: v.alturaDoBordo ?? 50 };
  }
  if (v.tipo === "cava") return { posicao: "superior", cavaLargura: v.cavaLargura ?? 30, deixarEspessura: v.deixarEspessura ?? 8 };
  return { reveal: v.reveal ?? 40, perfilLargura: v.perfilLargura ?? 20, perfilProf: v.perfilProf ?? 20 };
}

function PuxadoresPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPuxadores);
  const save = useServerFn(upsertPuxador);
  const del = useServerFn(deletePuxador);

  const { data, isLoading } = useQuery({ queryKey: ["puxadores"], queryFn: () => list() });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data ?? []).filter((t: any) =>
      [t.nome, PUXADOR_TIPO_LABEL[t.tipo as PuxadorTipo], t.fabricante].filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s)),
    );
  }, [data, search]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultsFor("convencional"),
  });
  const tipo = form.watch("tipo");
  const subtipo = form.watch("subtipo");

  function openNew() {
    setEditing(null);
    form.reset(defaultsFor("convencional"));
    setOpen(true);
  }
  function openEdit(t: any) {
    setEditing(t);
    const base = defaultsFor(t.tipo as PuxadorTipo, t.nome);
    const cfg = t.config ?? {};
    // map furoØ → furoO for form field
    const merged: FormVals = {
      ...base, nome: t.nome, tipo: t.tipo, fabricante: t.fabricante ?? "",
      ...(cfg.subtipo ? { subtipo: cfg.subtipo } : {}),
      ...(cfg.entreEixo != null ? { entreEixo: cfg.entreEixo } : {}),
      ...(cfg.furoØ != null ? { furoO: cfg.furoØ } : {}),
      ...(cfg.alturaDoBordo != null ? { alturaDoBordo: cfg.alturaDoBordo } : {}),
      ...(cfg.cavaLargura != null ? { cavaLargura: cfg.cavaLargura } : {}),
      ...(cfg.deixarEspessura != null ? { deixarEspessura: cfg.deixarEspessura } : {}),
      ...(cfg.reveal != null ? { reveal: cfg.reveal } : {}),
      ...(cfg.perfilLargura != null ? { perfilLargura: cfg.perfilLargura } : {}),
      ...(cfg.perfilProf != null ? { perfilProf: cfg.perfilProf } : {}),
    };
    form.reset(merged);
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async (v: FormVals) => save({ data: {
      id: editing?.id, values: {
        nome: v.nome, tipo: v.tipo, fabricante: v.fabricante || null,
        config: buildConfig(v),
      },
    } }),
    onSuccess: () => {
      toast.success(editing ? "Puxador atualizado" : "Puxador criado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["puxadores"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Apagado"); setDelId(null);
      qc.invalidateQueries({ queryKey: ["puxadores"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <CatalogShell
        title="Puxadores"
        subtitle="Puxadores convencionais, cavas e perfis de gola (J/C) com maquinaçao real."
        search={search} onSearch={setSearch} onAdd={openNew}
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyText={search ? "Sem resultados." : "Sem puxadores."}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell><Badge variant="secondary">{PUXADOR_TIPO_LABEL[t.tipo as PuxadorTipo] ?? t.tipo}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{t.fabricante ?? "—"}</TableCell>
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
          <SheetHeader><SheetTitle>{editing ? "Editar puxador" : "Novo puxador"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Fabricante</Label>
              <Input {...form.register("fabricante")} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => {
                const next = v as PuxadorTipo;
                form.reset(defaultsFor(next, form.getValues("nome")));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="convencional">Convencional (barra/botão)</SelectItem>
                  <SelectItem value="cava">Cava (fresagem)</SelectItem>
                  <SelectItem value="gola_j">Gola J (perfil)</SelectItem>
                  <SelectItem value="gola_c">Gola C (perfil)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {tipo === "convencional" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Subtipo</Label>
                  <Select value={subtipo ?? "barra"} onValueChange={(v) => form.setValue("subtipo", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barra">Barra (2 furos)</SelectItem>
                      <SelectItem value="botao">Botão (1 furo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {subtipo !== "botao" && (
                  <div className="space-y-1.5"><Label>Entre-eixo (mm)</Label>
                    <Input type="number" step={1} {...form.register("entreEixo")} /></div>
                )}
                <div className="space-y-1.5"><Label>Furo Ø (mm)</Label>
                  <Input type="number" step={0.5} {...form.register("furoO")} /></div>
                <div className="space-y-1.5"><Label>Altura do bordo (mm)</Label>
                  <Input type="number" step={1} {...form.register("alturaDoBordo")} /></div>
              </div>
            )}

            {tipo === "cava" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Cava largura (mm)</Label>
                  <Input type="number" step={1} {...form.register("cavaLargura")} /></div>
                <div className="space-y-1.5"><Label>Deixar espessura (mm)</Label>
                  <Input type="number" step={0.5} {...form.register("deixarEspessura")} /></div>
              </div>
            )}

            {(tipo === "gola_j" || tipo === "gola_c") && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Reveal (mm)</Label>
                  <Input type="number" step={1} {...form.register("reveal")} /></div>
                <div className="space-y-1.5"><Label>Perfil largura</Label>
                  <Input type="number" step={1} {...form.register("perfilLargura")} /></div>
                <div className="space-y-1.5"><Label>Perfil prof.</Label>
                  <Input type="number" step={1} {...form.register("perfilProf")} /></div>
              </div>
            )}

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
