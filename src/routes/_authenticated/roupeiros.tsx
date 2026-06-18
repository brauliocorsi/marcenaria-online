import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Shirt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Module3D } from "@/components/viewer/Module3D";

import {
  DEFAULT_MODULE_CONFIG, calcularPecas, intervalosSecoes,
  type ModuleConfig, type Secao, type SecaoTipo, type EspelhoModo,
} from "@/lib/engines/module";
import { upsertModule } from "@/lib/modules.functions";

export const Route = createFileRoute("/_authenticated/roupeiros")({
  component: RoupeirosPage,
});

const SECAO_LABEL: Record<SecaoTipo, string> = {
  nicho_aberto: "Nicho aberto (mesclar)",
  porta: "Secção com porta batente",
  gavetas: "Gaveteiro (frente decorativa ou interno)",
  varao: "Cabide (varão)",
  maleiro_aberto: "Maleiro aberto (prateleira)",
  maleiro_fechado: "Maleiro fechado (porta + prateleira)",
};

type DoorMode = "sem" | "batente" | "correr";

const DEFAULT_CORRER = {
  ativo: true,
  nFolhas: 2 as 2 | 3 | 4,
  espelho: "nenhum" as EspelhoModo,
  perfilLarguraMm: 25,
  perfilEspessuraMm: 20,
  recuoFrente: 5,
  alturaCalhaSup: 40,
  alturaCalhaInf: 40,
  folga: 10,
  sobreposicao: 40,
};

function makeInitialConfig(): ModuleConfig {
  const c: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 1800, height: 2400, depth: 600 },
    categoria: "roupeiro",
    portas: { ...DEFAULT_MODULE_CONFIG.portas, nPortas: 0 },
    gavetas: { ...DEFAULT_MODULE_CONFIG.gavetas, nGavetas: 0 },
    secoes: [
      { id: crypto.randomUUID(), altura_mm: 500, tipo: "maleiro_aberto", config: { nPrateleiras: 1 } },
      { id: crypto.randomUUID(), altura_mm: 1100, tipo: "varao", config: { prateleiraSuperior: false } },
      { id: crypto.randomUUID(), altura_mm: 740, tipo: "gavetas", config: { nGavetas: 4 } },
    ],
  };
  return c;
}

function RoupeirosPage() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: useServerFn(upsertModule),
    onSuccess: () => {
      toast.success("Roupeiro guardado na biblioteca");
      qc.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar"),
  });

  const [nome, setNome] = useState<string>("Roupeiro");
  const [config, setConfig] = useState<ModuleConfig>(() => makeInitialConfig());
  const [doorMode, setDoorMode] = useState<DoorMode>("sem");
  const [drawerPct, setDrawerPct] = useState<number>(0);
  const [doorAngle, setDoorAngle] = useState<number>(0);

  const secoes = config.secoes ?? [];
  const inv = useMemo(() => intervalosSecoes(config), [config]);
  const somaAlt = secoes.reduce((s, x) => s + x.altura_mm, 0);
  const espDiv = 19 * Math.max(0, secoes.length - 1);
  const total = somaAlt + espDiv;
  const ok = Math.abs(total - inv.alturaInterna) < 1;

  const setDims = (k: "width" | "height" | "depth", v: number) =>
    setConfig((c) => ({ ...c, dims: { ...c.dims, [k]: Math.max(100, Math.round(v)) } }));

  const setSecoes = (next: Secao[]) =>
    setConfig((c) => ({ ...c, secoes: next.length > 0 ? next : undefined }));

  const addSecao = (tipo: SecaoTipo) => {
    const id = crypto.randomUUID();
    const defaultCfg: any =
      tipo === "varao" ? { prateleiraSuperior: false } :
      tipo === "maleiro_aberto" ? { nPrateleiras: 1 } :
      tipo === "maleiro_fechado" ? { nPortas: 2, nPrateleiras: 1 } :
      tipo === "porta" ? { nPortas: 2 } :
      tipo === "gavetas" ? { nGavetas: 3, interno: false } :
      {};
    const def: Record<SecaoTipo, number> = {
      varao: 1000, maleiro_aberto: 450, maleiro_fechado: 500,
      porta: 1200, gavetas: 700, nicho_aberto: 400,
    };
    setSecoes([...secoes, { id, altura_mm: def[tipo], tipo, config: defaultCfg }]);
  };
  const removeSecao = (id: string) => setSecoes(secoes.filter((s) => s.id !== id));
  const moveSecao = (id: string, dir: -1 | 1) => {
    const i = secoes.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= secoes.length) return;
    const next = secoes.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setSecoes(next);
  };
  const updSecao = (id: string, patch: Partial<Secao>) =>
    setSecoes(secoes.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updSecaoCfg = (id: string, patch: Record<string, any>) =>
    setSecoes(secoes.map((s) => (s.id === id ? { ...s, config: { ...(s.config ?? {}), ...patch } } : s)));

  const aplicarDoorMode = (mode: DoorMode) => {
    setDoorMode(mode);
    setConfig((c) => {
      const portas = { ...c.portas };
      if (mode === "correr") portas.correr = { ...DEFAULT_CORRER };
      else delete portas.correr;
      return { ...c, portas };
    });
  };

  const onSave = () => {
    const pecas = calcularPecas(config);
    upsert.mutate({
      data: {
        name: nome || "Roupeiro",
        width_mm: config.dims.width,
        height_mm: config.dims.height,
        depth_mm: config.dims.depth,
        config: config as any,
        pieces: pecas as any,
      },
    } as any);
  };

  // helpers para portas de correr
  const cr = config.portas.correr;
  const setCr = (patch: Partial<NonNullable<ModuleConfig["portas"]["correr"]>>) =>
    setConfig((c) => ({ ...c, portas: { ...c.portas, correr: { ...(c.portas.correr ?? DEFAULT_CORRER), ...patch } } }));

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[480px_1fr]">
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Shirt className="h-4 w-4" /> <CardTitle className="text-sm">Roupeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-[10px]">Largura (mm)</Label>
                <Input type="number" className="tabular" value={config.dims.width}
                  onChange={(e) => setDims("width", Number(e.target.value))} /></div>
              <div><Label className="text-[10px]">Altura (mm)</Label>
                <Input type="number" className="tabular" value={config.dims.height}
                  onChange={(e) => setDims("height", Number(e.target.value))} /></div>
              <div><Label className="text-[10px]">Profundidade (mm)</Label>
                <Input type="number" className="tabular" value={config.dims.depth}
                  onChange={(e) => setDims("depth", Number(e.target.value))} /></div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Altura interna:</span>
              <span className="tabular">{Math.round(inv.alturaInterna)} mm</span>
              <span className="text-muted-foreground">· Somatório secções:</span>
              <span className={`tabular ${ok ? "text-emerald-600" : "text-destructive"}`}>
                {Math.round(total)} mm
              </span>
            </div>
            <Button onClick={onSave} disabled={upsert.isPending} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Guardar na biblioteca
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sistema de portas (global)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={doorMode} onValueChange={(v) => aplicarDoorMode(v as DoorMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem">Sem portas (módulo aberto / mesclar)</SelectItem>
                <SelectItem value="batente">Portas batente por secção</SelectItem>
                <SelectItem value="correr">Portas de correr globais</SelectItem>
              </SelectContent>
            </Select>
            {doorMode === "correr" && cr && (
              <div className="space-y-3 rounded border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Nº folhas</Label>
                    <Select value={String(cr.nFolhas)} onValueChange={(v) => setCr({ nFolhas: Number(v) as 2 | 3 | 4 })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Espelho</Label>
                    <Select value={cr.espelho} onValueChange={(v) => setCr({ espelho: v as EspelhoModo })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Sem espelho</SelectItem>
                        <SelectItem value="todas">Todas as folhas</SelectItem>
                        <SelectItem value="alternadas">Alternadas</SelectItem>
                        <SelectItem value="apenas_uma">Apenas uma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Calha sup (mm)</Label>
                    <Input type="number" className="tabular h-8" value={cr.alturaCalhaSup}
                      onChange={(e) => setCr({ alturaCalhaSup: Math.max(10, Number(e.target.value)) })} /></div>
                  <div><Label className="text-[10px]">Calha inf (mm)</Label>
                    <Input type="number" className="tabular h-8" value={cr.alturaCalhaInf}
                      onChange={(e) => setCr({ alturaCalhaInf: Math.max(10, Number(e.target.value)) })} /></div>
                  <div><Label className="text-[10px]">Perfil largura (mm)</Label>
                    <Input type="number" className="tabular h-8" value={cr.perfilLarguraMm}
                      onChange={(e) => setCr({ perfilLarguraMm: Math.max(10, Number(e.target.value)) })} /></div>
                  <div><Label className="text-[10px]">Sobreposição (mm)</Label>
                    <Input type="number" className="tabular h-8" value={cr.sobreposicao}
                      onChange={(e) => setCr({ sobreposicao: Math.max(0, Number(e.target.value)) })} /></div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Deslizar folhas ({Math.round(drawerPct * 100)}%)</Label>
                  <Slider value={[drawerPct]} min={0} max={1} step={0.01} onValueChange={([v]) => setDrawerPct(v)} />
                </div>
              </div>
            )}
            {doorMode === "batente" && (
              <div className="space-y-1">
                <Label className="text-[10px]">Abertura ({Math.round(doorAngle)}°)</Label>
                <Slider value={[doorAngle]} min={0} max={110} step={1} onValueChange={([v]) => setDoorAngle(v)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Secções (baixo → cima)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(["varao", "maleiro_aberto", "maleiro_fechado", "porta", "gavetas", "nicho_aberto"] as SecaoTipo[]).map((t) => (
                <Button key={t} variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => addSecao(t)}>
                  <Plus className="mr-1 h-3 w-3" /> {SECAO_LABEL[t].split(" ")[0]}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              {secoes.map((s, i) => (
                <div key={s.id} className="space-y-2 rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">#{i + 1} (de baixo)</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveSecao(s.id, -1)} disabled={i === 0}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveSecao(s.id, +1)} disabled={i === secoes.length - 1}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeSecao(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Altura (mm)</Label>
                      <Input type="number" className="tabular h-8" value={s.altura_mm}
                        onChange={(e) => updSecao(s.id, { altura_mm: Math.max(50, Number(e.target.value) || 50) })} />
                    </div>
                    <div><Label className="text-[10px]">Tipo</Label>
                      <Select value={s.tipo} onValueChange={(v) => updSecao(s.id, { tipo: v as SecaoTipo, config: {} })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SECAO_LABEL).map(([k, label]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {s.tipo === "nicho_aberto" && (
                    <div><Label className="text-[10px]">Prateleiras móveis</Label>
                      <Input type="number" min={0} max={10} className="tabular h-8"
                        value={(s.config as any)?.prateleirasMoveis ?? 0}
                        onChange={(e) => updSecaoCfg(s.id, { prateleirasMoveis: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} />
                    </div>
                  )}
                  {s.tipo === "varao" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Recuo topo varão (mm)</Label>
                        <Input type="number" className="tabular h-8"
                          value={(s.config as any)?.recuoTopoVarao_mm ?? 40}
                          onChange={(e) => updSecaoCfg(s.id, { recuoTopoVarao_mm: Math.max(20, Number(e.target.value) || 40) })} />
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch checked={!!(s.config as any)?.prateleiraSuperior}
                          onCheckedChange={(v) => updSecaoCfg(s.id, { prateleiraSuperior: v })} />
                        <Label className="text-[10px]">Prateleira superior</Label>
                      </div>
                    </div>
                  )}
                  {(s.tipo === "maleiro_aberto" || s.tipo === "maleiro_fechado") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Nº prateleiras</Label>
                        <Input type="number" min={1} max={6} className="tabular h-8"
                          value={(s.config as any)?.nPrateleiras ?? 1}
                          onChange={(e) => updSecaoCfg(s.id, { nPrateleiras: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })} />
                      </div>
                      {s.tipo === "maleiro_fechado" && (
                        <div><Label className="text-[10px]">Nº portas</Label>
                          <Select value={String((s.config as any)?.nPortas ?? 2)} onValueChange={(v) => updSecaoCfg(s.id, { nPortas: Number(v) })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 porta</SelectItem>
                              <SelectItem value="2">2 portas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                  {s.tipo === "porta" && (
                    <div><Label className="text-[10px]">Nº portas (batente)</Label>
                      <Select value={String((s.config as any)?.nPortas ?? 2)} onValueChange={(v) => updSecaoCfg(s.id, { nPortas: Number(v) })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 porta</SelectItem>
                          <SelectItem value="2">2 portas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {s.tipo === "gavetas" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Nº gavetas</Label>
                        <Input type="number" min={1} max={10} className="tabular h-8"
                          value={(s.config as any)?.nGavetas ?? 3}
                          onChange={(e) => updSecaoCfg(s.id, { nGavetas: Math.max(1, Math.min(10, Number(e.target.value) || 3)) })} />
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch checked={!!(s.config as any)?.interno}
                          onCheckedChange={(v) => updSecaoCfg(s.id, { interno: v })} />
                        <Label className="text-[10px]">Gaveteiro interno (atrás de porta)</Label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-h-[600px] rounded border bg-muted/20">
        <Module3D config={config} doorAngleDeg={doorAngle} drawerPct={drawerPct} showHardware={false} />
      </div>
    </div>
  );
}
