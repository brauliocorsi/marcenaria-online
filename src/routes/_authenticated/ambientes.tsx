import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Plus, Trash2, Home, AlertTriangle, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { Room3D, type PlacedModule } from "@/components/viewer/Room3D";
import { listAmbientes, upsertAmbiente, deleteAmbiente } from "@/lib/ambientes.functions";
import { listModules } from "@/lib/modules.functions";
import {
  listAmbienteModulos, upsertAmbienteModulo, deleteAmbienteModulo,
} from "@/lib/ambiente-modulos.functions";
import {
  DEFAULT_ROOM, normalizarRoom, validarAbertura, comprimentoParede,
  type RoomConfig, type ParedeId, type Abertura, type TipoAbertura,
} from "@/lib/engines/ambiente";
import { transformColocacao, type ParedeColocavel } from "@/lib/engines/ambiente-modulos";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/ambientes")({ component: AmbientesPage });

const PAREDES: { id: ParedeId; label: string }[] = [
  { id: "fundo", label: "Fundo" },
  { id: "frente", label: "Frente" },
  { id: "esquerda", label: "Esquerda" },
  { id: "direita", label: "Direita" },
];

function AmbientesPage() {
  const qc = useQueryClient();
  const fetchAmbientes = useServerFn(listAmbientes);
  const save = useServerFn(upsertAmbiente);
  const del = useServerFn(deleteAmbiente);
  const fetchModules = useServerFn(listModules);
  const fetchPlacements = useServerFn(listAmbienteModulos);
  const upsertPlacement = useServerFn(upsertAmbienteModulo);
  const deletePlacement = useServerFn(deleteAmbienteModulo);

  const { data: ambientes } = useQuery({ queryKey: ["ambientes"], queryFn: () => fetchAmbientes() });
  const { data: modules } = useQuery({ queryKey: ["modules"], queryFn: () => fetchModules() });

  const [name, setName] = useState("Ambiente sem nome");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomConfig>(DEFAULT_ROOM);
  const [delId, setDelId] = useState<string | null>(null);
  const [showHardware, setShowHardware] = useState(false);
  const [delPlacementId, setDelPlacementId] = useState<string | null>(null);

  const { data: placements } = useQuery({
    queryKey: ["ambiente_modulos", editingId],
    queryFn: () => editingId ? fetchPlacements({ data: { ambienteId: editingId } }) : Promise.resolve([]),
    enabled: !!editingId,
  });

  const placementsForRender: PlacedModule[] = useMemo(() => {
    if (!placements || !modules) return [];
    return (placements as any[]).flatMap((p) => {
      const m = (modules as any[]).find((x) => x.id === p.module_id);
      if (!m) return [];
      return [{
        id: p.id,
        module: m,
        parede: p.parede,
        x_offset_mm: p.x_offset_mm,
        altura_chao_mm: p.altura_chao_mm,
        rotacao_deg: p.rotacao_deg,
      }];
    });
  }, [placements, modules]);

  function loadAmbiente(a: any) {
    setEditingId(a.id);
    setName(a.name);
    setRoom(normalizarRoom(a.config));
  }

  function novo() {
    setEditingId(null);
    setName("Ambiente sem nome");
    setRoom(DEFAULT_ROOM);
  }

  const saveMut = useMutation({
    mutationFn: async () => save({ data: { id: editingId ?? undefined, name, config: room } }),
    onSuccess: (row: any) => {
      toast.success(editingId ? "Ambiente atualizado" : "Ambiente guardado");
      setEditingId(row.id);
      qc.invalidateQueries({ queryKey: ["ambientes"] });
    },
    onError: (e: Error) => toast.error("Erro ao guardar", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Ambiente apagado");
      if (editingId === delId) novo();
      setDelId(null);
      qc.invalidateQueries({ queryKey: ["ambientes"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const placementMut = useMutation({
    mutationFn: async (payload: any) => upsertPlacement({ data: payload }),
    onSuccess: () => {
      toast.success("Colocação guardada");
      qc.invalidateQueries({ queryKey: ["ambiente_modulos", editingId] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const placementDelMut = useMutation({
    mutationFn: async (id: string) => deletePlacement({ data: { id } }),
    onSuccess: () => {
      toast.success("Colocação removida");
      setDelPlacementId(null);
      qc.invalidateQueries({ queryKey: ["ambiente_modulos", editingId] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const updDim = (k: "largura" | "profundidade" | "altura" | "espessuraParede", v: number) =>
    setRoom((r) => ({ ...r, [k]: Math.round(v) }));

  const updParede = (id: ParedeId, v: boolean) =>
    setRoom((r) => ({ ...r, paredesVisiveis: { ...r.paredesVisiveis, [id]: v } }));

  function addAbertura(paredeId: ParedeId, tipo: TipoAbertura) {
    const nova: Abertura = {
      id: crypto.randomUUID(),
      paredeId, tipo,
      x: 100, y: tipo === "porta" ? 0 : 900,
      largura: tipo === "porta" ? 800 : 1200,
      altura: tipo === "porta" ? 2100 : 1000,
    };
    setRoom((r) => ({ ...r, aberturas: [...r.aberturas, nova] }));
  }

  function updAbertura(id: string, patch: Partial<Abertura>) {
    setRoom((r) => ({
      ...r,
      aberturas: r.aberturas.map((a) => a.id === id ? { ...a, ...patch, y: patch.tipo === "porta" ? 0 : (patch.y ?? a.y) } : a),
    }));
  }

  function removeAbertura(id: string) {
    setRoom((r) => ({ ...r, aberturas: r.aberturas.filter((a) => a.id !== id) }));
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ambientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Define a sala (paredes + chão) para depois colocar módulos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            <Switch id="show-hw" checked={showHardware} onCheckedChange={setShowHardware} />
            <Label htmlFor="show-hw" className="cursor-pointer">Furação/ferragens</Label>
          </div>
          <Button variant="outline" onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" /> {saveMut.isPending ? "A guardar…" : "Guardar ambiente"}
          </Button>
        </div>
      </div>

      {ambientes && ambientes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ambientes.map((a: any) => (
            <div
              key={a.id}
              className={cn(
                "group flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                editingId === a.id ? "border-primary bg-accent" : "border-border",
              )}
            >
              <button onClick={() => loadAmbiente(a)} className="px-1">
                <Home className="mr-1 inline h-3 w-3" /> {a.name}
              </button>
              <button
                onClick={() => setDelId(a.id)}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                aria-label="Apagar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dimensões (mm)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SliderField label="Largura" value={room.largura} min={500} max={8000} step={10} onChange={(v) => updDim("largura", v)} />
              <SliderField label="Profundidade" value={room.profundidade} min={500} max={8000} step={10} onChange={(v) => updDim("profundidade", v)} />
              <SliderField label="Altura" value={room.altura} min={2000} max={3500} step={10} onChange={(v) => updDim("altura", v)} />
              <SliderField label="Espessura parede" value={room.espessuraParede} min={20} max={500} step={5} onChange={(v) => updDim("espessuraParede", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Paredes visíveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {PAREDES.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Label htmlFor={`par-${p.id}`}>Mostrar {p.label.toLowerCase()}</Label>
                  <Switch
                    id={`par-${p.id}`}
                    checked={room.paredesVisiveis[p.id]}
                    onCheckedChange={(v) => updParede(p.id, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Janelas e vãos</CardTitle>
              <AddAberturaButton onAdd={addAbertura} />
            </CardHeader>
            <CardContent className="space-y-3">
              {room.aberturas.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem aberturas. Usa "Adicionar".</p>
              )}
              {room.aberturas.map((ab) => (
                <AberturaRow
                  key={ab.id}
                  ab={ab}
                  room={room}
                  onChange={(p: Partial<Abertura>) => updAbertura(ab.id, p)}
                  onRemove={() => removeAbertura(ab.id)}
                />

              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Módulos no ambiente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!editingId && (
                <p className="text-xs text-muted-foreground">
                  Guarda o ambiente primeiro para poderes colocar módulos.
                </p>
              )}
              {editingId && (modules ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sem módulos guardados. Cria um em "Módulos" primeiro.
                </p>
              )}
              {editingId && (modules ?? []).length > 0 && (
                <AddPlacement
                  modules={modules as any[]}
                  onAdd={(payload) => placementMut.mutate({ ambiente_id: editingId, ...payload })}
                />
              )}
              {(placements as any[] | undefined ?? []).map((p) => {
                const m = (modules as any[] | undefined ?? []).find((x) => x.id === p.module_id);
                if (!m) return null;
                const t = transformColocacao(
                  { parede: p.parede, x_offset_mm: p.x_offset_mm, altura_chao_mm: p.altura_chao_mm, rotacao_deg: p.rotacao_deg },
                  { width: m.width_mm, height: m.height_mm, depth: m.depth_mm },
                  { largura: room.largura, profundidade: room.profundidade, altura: room.altura },
                );
                return (
                  <PlacementRow
                    key={p.id}
                    placement={p}
                    moduleName={m.name}
                    moduleW={m.width_mm}
                    excede={t.excede}
                    onChange={(patch) => placementMut.mutate({ id: p.id, ambiente_id: editingId, module_id: p.module_id, parede: p.parede, x_offset_mm: p.x_offset_mm, altura_chao_mm: p.altura_chao_mm, rotacao_deg: p.rotacao_deg, ...patch })}
                    onRemove={() => setDelPlacementId(p.id)}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>


        <Card className="overflow-hidden">
          <div className="h-[640px] w-full bg-muted">
            <Room3D room={room} placements={placementsForRender} showHardware={showHardware} />
          </div>
        </Card>
      </div>


      <ConfirmDelete open={!!delId} onOpenChange={(o) => !o && setDelId(null)} onConfirm={() => delId && delMut.mutate(delId)} />
    </div>
  );
}

function SliderField({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          className="h-7 w-24 text-right text-xs"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function AddAberturaButton({ onAdd }: { onAdd: (p: ParedeId, t: TipoAbertura) => void }) {
  const [parede, setParede] = useState<ParedeId>("fundo");
  const [tipo, setTipo] = useState<TipoAbertura>("janela");
  return (
    <div className="flex items-center gap-1">
      <Select value={parede} onValueChange={(v) => setParede(v as ParedeId)}>
        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PAREDES.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAbertura)}>
        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="janela" className="text-xs">Janela</SelectItem>
          <SelectItem value="porta" className="text-xs">Porta</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onAdd(parede, tipo)}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

function AberturaRow({
  ab, room, onChange, onRemove,
}: { ab: Abertura; room: RoomConfig; onChange: (p: Partial<Abertura>) => void; onRemove: () => void }) {
  const validacao = useMemo(() => validarAbertura(room, ab), [room, ab]);
  const comp = comprimentoParede(room, ab.paredeId);
  return (
    <div className={cn("rounded-md border p-2 space-y-2", !validacao.valido && "border-destructive")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Select value={ab.paredeId} onValueChange={(v) => onChange({ paredeId: v as ParedeId })}>
            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAREDES.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ab.tipo} onValueChange={(v) => onChange({ tipo: v as TipoAbertura, y: v === "porta" ? 0 : ab.y })}>
            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="janela" className="text-xs">Janela</SelectItem>
              <SelectItem value="porta" className="text-xs">Porta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label={`x (0..${comp})`} value={ab.x} onChange={(v) => onChange({ x: v })} />
        <NumField label="y" value={ab.y} onChange={(v) => onChange({ y: v })} disabled={ab.tipo === "porta"} />
        <NumField label="largura" value={ab.largura} onChange={(v) => onChange({ largura: v })} />
        <NumField label="altura" value={ab.altura} onChange={(v) => onChange({ altura: v })} />
      </div>
      {!validacao.valido && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" /> {validacao.motivo}
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        className="h-7 text-xs"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
      />
    </div>
  );
}

