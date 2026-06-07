import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LibraryBig, Plus, ArrowRight } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upsertModule } from "@/lib/modules.functions";
import { calcularPecas } from "@/lib/engines/module";
import {
  PRESETS_COZINHA, instanciarPreset, type CategoriaModulo, type PresetCozinha,
} from "@/lib/engines/presets-cozinha";

const searchSchema = z.object({}).passthrough();

export const Route = createFileRoute("/_authenticated/biblioteca")({
  validateSearch: searchSchema,
  component: BibliotecaPage,
});

const CAT_LABEL: Record<CategoriaModulo, string> = {
  base: "Base", superior: "Superior", coluna: "Coluna", gaveteiro: "Gaveteiro",
  canto: "Canto", ilha: "Ilha", roupeiro: "Roupeiro", nicho: "Nicho",
};

function BibliotecaPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const save = useServerFn(upsertModule);
  const [filter, setFilter] = useState<"todos" | CategoriaModulo>("todos");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return PRESETS_COZINHA.filter((p) => {
      if (filter !== "todos" && p.categoria !== filter) return false;
      if (q.trim() && !p.nome.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [filter, q]);

  const createMut = useMutation({
    mutationFn: async (preset: PresetCozinha) => {
      const inst = instanciarPreset(preset.id)!;
      const pieces = calcularPecas(inst.config);
      return save({
        data: {
          name: inst.nome,
          width_mm: inst.config.dims.width,
          height_mm: inst.config.dims.height,
          depth_mm: inst.config.dims.depth,
          config: inst.config as any,
          pieces: pieces as any,
          material_id: null,
        },
      });
    },
    onSuccess: (row: any) => {
      toast.success("Módulo criado a partir do preset");
      qc.invalidateQueries({ queryKey: ["modules"] });
      navigate({ to: "/modulos", search: { openId: row.id } as any });
    },
    onError: (e: Error) => toast.error("Erro a criar módulo", { description: e.message }),
  });

  const categorias: Array<"todos" | CategoriaModulo> = ["todos", "base", "superior", "coluna", "gaveteiro"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LibraryBig className="h-6 w-6 text-primary" /> Biblioteca de presets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Módulos pré-feitos de cozinha. Cria uma cópia editável em /módulos.
          </p>
        </div>
        <Link to="/modulos"><Button variant="outline">Ir para Módulos <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            {categorias.map((c) => (
              <TabsTrigger key={c} value={c}>{c === "todos" ? "Todos" : CAT_LABEL[c]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Procurar…" value={q} onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} preset(s)</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{p.nome}</CardTitle>
                <Badge variant="secondary">{CAT_LABEL[p.categoria]}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground tabular pt-1">
                {p.config.dims.width}×{p.config.dims.height}×{p.config.dims.depth} mm
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <p className="text-sm text-muted-foreground">{p.descricao}</p>
              <Button
                size="sm"
                disabled={createMut.isPending}
                onClick={() => createMut.mutate(p)}
              >
                <Plus className="mr-2 h-4 w-4" /> Criar módulo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
