// Motor de furação — função pura e determinística.
// X=W, Y=H, Z=D. Suporta ambos sistemas: 'laterais_cobrem' e 'tampo_base_cobrem'.


import { resolverEspessuras, dimensoesPortas, posicoesDobradicasY, type ModuleConfig, type PieceType, type Vec3 } from "./module";
import type { TemplateConfig } from "@/lib/drilling.functions";

export type TipoFuro = "cavilha" | "minifix_corpo" | "minifix_perno" | "parafuso" | "dobradica" | "marcacao" | "pino";

export interface DrillBitLike {
  id: string;
  name: string;
  diameter_mm: number | string;
  purpose: "cavilha" | "minifix" | "parafuso" | "geral";
  tool_type?: string | null;
  passante?: boolean | null;
  max_depth_mm?: number | null;
}

export interface Furo {
  junta: string;
  tipo_furo: TipoFuro;
  pos: Vec3;
  dir: Vec3;
  diametro: number;
  profundidade: number;
  peca: PieceType;
  ferramentaId?: string | null;
  ferramentaNome?: string | null;
  tool_type?: string | null;
}

type Papel = "cavilha" | "minifix" | "parafuso";

function papeisPorJunta(sistema: TemplateConfig["sistemaUniao"], nIn: number): Papel[] {
  let n = nIn;
  if ((sistema === "minifix_cavilha" || sistema === "cavilha_parafuso" || sistema === "parafuso_cavilha") && n === 2) n = 3;
  // 4G: em minifix_cavilha, TODOS os pontos são minifix (kit). A cavilha vem como companheira a 32mm.
  if (sistema === "minifix_cavilha") return new Array(n).fill("minifix");
  const r: Papel[] = new Array(n).fill("cavilha");
  if (n === 1) { r[0] = sistema === "parafuso_direto" ? "parafuso" : "cavilha"; return r; }
  for (let k = 0; k < n; k++) {
    const extremo = k === 0 || k === n - 1;
    if (sistema === "parafuso_direto") r[k] = "parafuso";
    else if (extremo) r[k] = "cavilha";
    else r[k] = "parafuso";
  }
  return r;
}

function diametroPara(t: TipoFuro, regras: TemplateConfig["regras"]): number {
  switch (t) {
    case "cavilha": return regras.diam_cavilha;
    case "minifix_corpo": return 15;
    case "minifix_perno": return 8;
    case "parafuso": return regras.diam_parafuso;
    case "dobradica": return 35;
    case "marcacao": return 3;
    case "pino": return 5;
  }
}
function profundidadePara(t: TipoFuro, regras: TemplateConfig["regras"]): number {
  switch (t) {
    case "cavilha":
    case "parafuso":
    case "minifix_perno": return regras.prof_cavilha;
    case "minifix_corpo": return regras.prof_minifix;
    case "dobradica": return regras.prof_minifix;
    case "marcacao": return 0.5;
    case "pino": return 12;
  }
}

// ── Resolução de ferramentas por lógica (purpose+diâmetro+tool_type+passante) ──
function purposeFor(t: TipoFuro): "cavilha" | "minifix" | "parafuso" | "geral" {
  if (t === "cavilha") return "cavilha";
  if (t === "minifix_corpo" || t === "minifix_perno") return "minifix";
  if (t === "parafuso") return "parafuso";
  return "geral"; // dobradiça
}

function resolverFerramenta(
  t: TipoFuro,
  diametro: number,
  bits: DrillBitLike[] | undefined,
  templateBrocas: TemplateConfig["brocas"],
): { id: string | null; nome: string | null; tool_type: string | null } {
  const purpose = purposeFor(t);
  const passanteExpected = false;
  const eq = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 0.001;

  // CRITÉRIO PRIMÁRIO: diâmetro exato + tool_type='broca'. Sem match → "(em falta)".
  if (bits && bits.length > 0) {
    const sameDiam = bits.filter(b => eq(Number(b.diameter_mm), diametro) && (b.tool_type ?? "broca") === "broca");
    if (sameDiam.length > 0) {
      const exact = sameDiam.find(b => b.purpose === purpose && Boolean(b.passante) === passanteExpected);
      if (exact) return { id: exact.id, nome: exact.name, tool_type: exact.tool_type ?? "broca" };
      const byPurpose = sameDiam.find(b => b.purpose === purpose);
      if (byPurpose) return { id: byPurpose.id, nome: byPurpose.name, tool_type: byPurpose.tool_type ?? "broca" };
      const any = sameDiam[0];
      return { id: any.id, nome: any.name, tool_type: any.tool_type ?? "broca" };
    }
    const tplKey: keyof TemplateConfig["brocas"] | null =
      t === "cavilha" ? "cavilha" :
      t === "minifix_corpo" ? "minifix_corpo" :
      t === "minifix_perno" ? "minifix_perno" :
      t === "parafuso" ? "parafuso" :
      t === "dobradica" ? "dobradica" : null;
    const tplId = tplKey ? (templateBrocas?.[tplKey] ?? null) : null;
    if (tplId) {
      const tb = bits.find(b => b.id === tplId && eq(Number(b.diameter_mm), diametro));
      if (tb) return { id: tb.id, nome: tb.name, tool_type: tb.tool_type ?? "broca" };
    }
    return { id: null, nome: `(em falta: Ø${diametro}mm)`, tool_type: "broca" };
  }

  const nome =
    t === "cavilha" ? `Broca cavilha Ø${diametro}` :
    t === "minifix_corpo" ? `Broca minifix corpo Ø${diametro}` :
    t === "minifix_perno" ? `Broca minifix perno Ø${diametro}` :
    t === "parafuso" ? `Broca pré-furo Ø${diametro}` :
    t === "dobradica" ? `Broca dobradiça Ø${diametro}` :
    t === "pino" ? `Broca pino Ø${diametro}` :
    t === "marcacao" ? `Broca ${diametro} mm` :
    `Broca ${diametro} mm`;
  return { id: null, nome, tool_type: "broca" };
}

function makeFuro(
  base: Omit<Furo, "ferramentaId" | "ferramentaNome" | "tool_type">,
  bits: DrillBitLike[] | undefined,
  templateBrocas: TemplateConfig["brocas"],
): Furo {
  const r = resolverFerramenta(base.tipo_furo, base.diametro, bits, templateBrocas);
  return { ...base, ferramentaId: r.id, ferramentaNome: r.nome, tool_type: r.tool_type };
}

function posicoesZ(D: number, n: number, recuo: number): number[] {
  if (n <= 1) return [D / 2];
  const span = D - 2 * recuo;
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(recuo + (k * span) / (n - 1));
  return out;
}

function tipoNaFace(papel: Papel): TipoFuro {
  if (papel === "minifix") return "minifix_corpo";
  if (papel === "cavilha") return "cavilha";
  return "parafuso";
}
function tipoNoTopo(papel: Papel): TipoFuro {
  if (papel === "minifix") return "minifix_perno";
  if (papel === "cavilha") return "cavilha";
  return "parafuso";
}

/**
 * Definição de uma junta minifix/cavilha entre 2 painéis a 90°.
 * - pecaCobre: painel CONTÍNUO (recebe relógio Ø15 na sua face interna)
 * - pecaEncosta: painel que ENCOSTA (recebe perno Ø8 na sua orla)
 * O relógio e o perno do MESMO minifix partilham (x, y) e estão colineares.
 * O eixo (dir) do relógio é perpendicular à face de pecaCobre (entra no painel).
 * O eixo do perno é ao longo do comprimento de pecaEncosta (entra a partir da orla).
 * Para varrer Z usamos (xRef, yRef) fixos e variamos a coordenada Z.
 */
type JuntaDef = {
  nome: string;
  xRef: number;
  yRef: number;
  dirCobre: Vec3;
  dirEncosta: Vec3;
  pecaCobre: PieceType;
  pecaEncosta: PieceType;
};

export function calcularFuros(
  config: ModuleConfig,
  template: TemplateConfig,
  bits?: DrillBitLike[],
): Furo[] {
  const { dims, espessuraPadrao, espessuras, nPrateleiras, sistemaMontagem } = config;
  const W = dims.width, H = dims.height, D = dims.depth;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  const { regras, sistemaUniao, brocas } = template;

  const L = D;
  const nBase = Math.max(regras.conectores_min, Math.ceil(L / regras.conectores_por_mm));
  const papeis = papeisPorJunta(sistemaUniao, nBase);
  const n = papeis.length;
  const zs = posicoesZ(D, n, regras.recuo_extremidade);
  const zMin = regras.recuo_extremidade;
  const zMax = D - regras.recuo_extremidade;
  const dz = regras.espacamento_cavilha_minifix ?? 32;

  const juntas: JuntaDef[] = [];

  if (sistemaMontagem === "laterais_cobrem") {
    // Relógio na face interna da LATERAL; perno na orla do TAMPO/BASE.
    const yT = H - e.tampo / 2, yB = e.base / 2;
    juntas.push({ nome: "lateral_esq↔tampo", xRef: e.lateral, yRef: yT,
      dirCobre: [-1, 0, 0], dirEncosta: [1, 0, 0], pecaCobre: "lateral", pecaEncosta: "tampo" });
    juntas.push({ nome: "lateral_dir↔tampo", xRef: W - e.lateral, yRef: yT,
      dirCobre: [1, 0, 0], dirEncosta: [-1, 0, 0], pecaCobre: "lateral", pecaEncosta: "tampo" });
    juntas.push({ nome: "lateral_esq↔base", xRef: e.lateral, yRef: yB,
      dirCobre: [-1, 0, 0], dirEncosta: [1, 0, 0], pecaCobre: "lateral", pecaEncosta: "base" });
    juntas.push({ nome: "lateral_dir↔base", xRef: W - e.lateral, yRef: yB,
      dirCobre: [1, 0, 0], dirEncosta: [-1, 0, 0], pecaCobre: "lateral", pecaEncosta: "base" });
  } else {
    // tampo_base_cobrem — INVERTE: relógio em TAMPO/BASE, perno na orla da LATERAL.
    const yT = H - e.tampo, yB = e.base;
    const xLE = e.lateral / 2, xLD = W - e.lateral / 2;
    juntas.push({ nome: "tampo↔lateral_esq", xRef: xLE, yRef: yT,
      dirCobre: [0, 1, 0], dirEncosta: [0, -1, 0], pecaCobre: "tampo", pecaEncosta: "lateral" });
    juntas.push({ nome: "tampo↔lateral_dir", xRef: xLD, yRef: yT,
      dirCobre: [0, 1, 0], dirEncosta: [0, -1, 0], pecaCobre: "tampo", pecaEncosta: "lateral" });
    juntas.push({ nome: "base↔lateral_esq", xRef: xLE, yRef: yB,
      dirCobre: [0, -1, 0], dirEncosta: [0, 1, 0], pecaCobre: "base", pecaEncosta: "lateral" });
    juntas.push({ nome: "base↔lateral_dir", xRef: xLD, yRef: yB,
      dirCobre: [0, -1, 0], dirEncosta: [0, 1, 0], pecaCobre: "base", pecaEncosta: "lateral" });
  }

  // Prateleiras FIXAS → junta minifix+cavilha normal (relógio na lateral, perno na orla da prateleira).
  // Prateleiras MÓVEIS (default) → não geram juntas; geram pinos Ø5 (ver abaixo).
  const prateleirasMoveis = config.prateleirasMoveis !== false;
  if (nPrateleiras > 0 && !prateleirasMoveis) {
    const innerBottom = e.base;
    const innerHeight = H - e.base - e.tampo;
    for (let i = 1; i <= nPrateleiras; i++) {
      const cy = innerBottom + (innerHeight * i) / (nPrateleiras + 1);
      juntas.push({ nome: `lateral_esq↔prateleira${i}`, xRef: e.lateral, yRef: cy,
        dirCobre: [-1, 0, 0], dirEncosta: [1, 0, 0], pecaCobre: "lateral", pecaEncosta: "prateleira" });
      juntas.push({ nome: `lateral_dir↔prateleira${i}`, xRef: W - e.lateral, yRef: cy,
        dirCobre: [1, 0, 0], dirEncosta: [-1, 0, 0], pecaCobre: "lateral", pecaEncosta: "prateleira" });
    }
  }

  const furos: Furo[] = [];
  const push2 = (junta: string, tCobre: TipoFuro, tEncosta: TipoFuro, j: JuntaDef, z: number) => {
    furos.push(makeFuro({
      junta, tipo_furo: tCobre,
      pos: [j.xRef, j.yRef, z],
      dir: j.dirCobre,
      diametro: diametroPara(tCobre, regras),
      profundidade: profundidadePara(tCobre, regras),
      peca: j.pecaCobre,
    }, bits, brocas));
    furos.push(makeFuro({
      junta, tipo_furo: tEncosta,
      pos: [j.xRef, j.yRef, z],
      dir: j.dirEncosta,
      diametro: diametroPara(tEncosta, regras),
      profundidade: profundidadePara(tEncosta, regras),
      peca: j.pecaEncosta,
    }, bits, brocas));
  };

  for (const j of juntas) {
    for (let k = 0; k < n; k++) {
      const papel = papeis[k];
      const z = zs[k];
      const tCobre = tipoNaFace(papel);       // relógio (corpo) ou cavilha ou parafuso
      const tEncosta = tipoNoTopo(papel);     // perno ou cavilha ou parafuso
      push2(j.nome, tCobre, tEncosta, j, z);

      // Cavilha companheira para cada minifix (a 32mm em direção ao centro).
      if (papel === "minifix") {
        let zComp = z + (z < D / 2 ? dz : -dz);
        if (zComp < zMin || zComp > zMax) zComp = z + (z < D / 2 ? -dz : dz);
        if (zComp < zMin) zComp = zMin;
        if (zComp > zMax) zComp = zMax;
        push2(`${j.nome}_cav`, "cavilha", "cavilha", j, zComp);
      }
    }
  }

  // ── Pinos Ø5 para prateleiras móveis (default) ──
  if (nPrateleiras > 0 && prateleirasMoveis) {
    const innerBottom = e.base;
    const innerHeight = H - e.base - e.tampo;
    const s = config.sistema32;
    const recF = s?.recuoFrente ?? 37;
    const recT = s?.recuoTras ?? 37;
    const zs2 = [recF, D - recT];
    for (let i = 1; i <= nPrateleiras; i++) {
      const cy = innerBottom + (innerHeight * i) / (nPrateleiras + 1);
      // Se sistema 32 ativo, snap à coluna 32 mais próxima.
      let yPino = cy;
      if (s?.ativo) {
        const ini = s.inicioY ?? 100;
        const passo = Math.max(1, s.passoVertical ?? 32);
        const fim = s.fimY ?? (H - 100);
        const k = Math.round((cy - ini) / passo);
        yPino = Math.min(fim, Math.max(ini, ini + k * passo));
      }
      for (const lado of ["esq", "dir"] as const) {
        const xFace = lado === "esq" ? e.lateral : W - e.lateral;
        const dir: Vec3 = lado === "esq" ? [-1, 0, 0] : [1, 0, 0];
        for (const z of zs2) {
          furos.push(makeFuro({
            junta: `prateleira${i}_pino_${lado}`,
            tipo_furo: "pino",
            pos: [xFace, yPino, z],
            dir,
            diametro: diametroPara("pino", regras),
            profundidade: profundidadePara("pino", regras),
            peca: "lateral",
          }, bits, brocas));
        }
      }
    }
  }

  return furos;
}


// ───── Dobradiças ─────
const RECUO_CANECO = 22;
const RECUO_FRENTE_CHAPA = 37;
const SEP_CHAPA_Y = 32;

export function calcularDobradicas(
  config: ModuleConfig,
  template: TemplateConfig,
  bits?: DrillBitLike[],
): Furo[] {
  const portas = dimensoesPortas(config);
  if (portas.length === 0) return [];
  const { regras, brocas } = template;
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const W = config.dims.width;
  const diamParafuso = regras.diam_parafuso;
  const profParafuso = regras.prof_cavilha;
  const diamCaneco = 35;
  const profCaneco = regras.prof_minifix;
  const out: Furo[] = [];

  for (const p of portas) {
    const ys = posicoesDobradicasY(p);
    const xCaneco = p.ladoDobradicas === "esquerda" ? p.xCharneira + RECUO_CANECO : p.xCharneira - RECUO_CANECO;
    const xFaceLateral = p.ladoDobradicas === "esquerda" ? e.lateral : W - e.lateral;
    const dirLateral: Vec3 = p.ladoDobradicas === "esquerda" ? [-1, 0, 0] : [1, 0, 0];
    const dirCaneco: Vec3 = [0, 0, 1];
    const zChapa = config.dims.depth - RECUO_FRENTE_CHAPA;

    for (const y of ys) {
      out.push(makeFuro({
        junta: `dobradica_${p.descricao}`,
        tipo_furo: "dobradica",
        pos: [xCaneco, y, p.zBack],
        dir: dirCaneco,
        diametro: diamCaneco,
        profundidade: profCaneco,
        peca: "porta",
      }, bits, brocas));
      for (const dy of [-SEP_CHAPA_Y / 2, SEP_CHAPA_Y / 2]) {
        out.push(makeFuro({
          junta: `dobradica_chapa_${p.descricao}`,
          tipo_furo: "parafuso",
          pos: [xFaceLateral, y + dy, zChapa],
          dir: dirLateral,
          diametro: diamParafuso,
          profundidade: profParafuso,
          peca: "lateral",
        }, bits, brocas));
      }
    }
  }
  return out;
}

// ───── Corrediças ─────
import { dimensoesGavetas } from "./module";

export function calcularCorredicas(
  config: ModuleConfig,
  template: TemplateConfig,
  bits?: DrillBitLike[],
): Furo[] {
  const { caixas } = dimensoesGavetas(config);
  if (caixas.length === 0) return [];
  const { regras, brocas } = template;
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const W = config.dims.width;
  const diam = 3;
  const prof = 0.5;
  const out: Furo[] = [];

  for (const c of caixas) {
    const tipo = c.tipoCorredica ?? "telescopica";
    const y = c.center[1];

    if (tipo === "oculta") {
      // Undermount: clip frontal na frente da caixa + suporte traseiro nas ilhargas.
      const halfW = c.boxWidth / 2;
      const yBaixo = y - c.boxHeight / 2 + 6;
      // Clip frontal (centro da frente da caixa)
      out.push(makeFuro({
        junta: `corredica_gaveta${c.idx + 1}_clip_frente`,
        tipo_furo: "marcacao",
        pos: [c.center[0], yBaixo, c.zFront],
        dir: [0, 0, 1],
        diametro: diam, profundidade: prof, peca: "gaveta_frenteCaixa",
      }, bits, brocas));
      // Suporte traseiro (2 pontos, um por ilharga)
      for (const lado of ["esq", "dir"] as const) {
        const xIl = lado === "esq" ? c.center[0] - halfW : c.center[0] + halfW;
        out.push(makeFuro({
          junta: `corredica_gaveta${c.idx + 1}_suporte_tras_${lado}`,
          tipo_furo: "marcacao",
          pos: [xIl, yBaixo, c.zBack + regras.recuo_frontal],
          dir: [0, -1, 0],
          diametro: diam, profundidade: prof, peca: "gaveta_lateral",
        }, bits, brocas));
      }
      continue;
    }

    // Telescópica / Roldanas: marcas na lateral (3 pontos) + ilharga (3 pontos)
    const zF = c.zFront - regras.recuo_frontal;
    const zB = c.zBack + regras.recuo_frontal;
    const zM = (c.zBack + c.zFront) / 2;
    const zs = [zB, zM, zF];
    const halfW = c.boxWidth / 2;
    for (const lado of ["esq", "dir"] as const) {
      const xFace = lado === "esq" ? e.lateral : W - e.lateral;
      const dirLat: Vec3 = lado === "esq" ? [-1, 0, 0] : [1, 0, 0];
      const xIl = lado === "esq" ? c.center[0] - halfW : c.center[0] + halfW;
      const dirIl: Vec3 = lado === "esq" ? [1, 0, 0] : [-1, 0, 0];
      for (const z of zs) {
        // lateral do módulo
        out.push(makeFuro({
          junta: `corredica_gaveta${c.idx + 1}_lateral_${lado}`,
          tipo_furo: "marcacao",
          pos: [xFace, y, z], dir: dirLat,
          diametro: diam, profundidade: prof, peca: "lateral",
        }, bits, brocas));
        // ilharga da gaveta
        out.push(makeFuro({
          junta: `corredica_gaveta${c.idx + 1}_ilharga_${lado}`,
          tipo_furo: "marcacao",
          pos: [xIl, y, z], dir: dirIl,
          diametro: diam, profundidade: prof, peca: "gaveta_lateral",
        }, bits, brocas));
      }
    }
  }
  return out;
}

export function contarCorredicas(config: ModuleConfig): number {
  return dimensoesGavetas(config).caixas.length * 2;
}

// ───── Sistema 32 / Pino de prateleira ─────
export function calcularSistema32(
  config: ModuleConfig,
  template: TemplateConfig,
  bits?: DrillBitLike[],
): Furo[] {
  const s = config.sistema32;
  if (!s || !s.ativo) return [];
  const W = config.dims.width, H = config.dims.height, D = config.dims.depth;
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const recuoF = Math.max(0, s.recuoFrente ?? 37);
  const recuoT = Math.max(0, s.recuoTras ?? 37);
  const passo = Math.max(1, s.passoVertical ?? 32);
  const inicioY = Math.max(0, s.inicioY ?? 100);
  const fimY = Math.min(H, s.fimY ?? (H - 100));
  if (fimY <= inicioY) return [];
  const ys: number[] = [];
  for (let y = inicioY; y <= fimY + 0.001; y += passo) ys.push(y);
  const zs = [recuoF, D - recuoT];
  const out: Furo[] = [];
  const diam = 5;
  const prof = 12;
  const { brocas } = template;
  for (const lado of ["esq", "dir"] as const) {
    const xFace = lado === "esq" ? e.lateral : W - e.lateral;
    const dir: Vec3 = lado === "esq" ? [-1, 0, 0] : [1, 0, 0];
    for (const z of zs) {
      for (const y of ys) {
        out.push(makeFuro({
          junta: `sistema32_${lado}_${z < D / 2 ? "frente" : "tras"}`,
          tipo_furo: "pino",
          pos: [xFace, y, z],
          dir,
          diametro: diam,
          profundidade: prof,
          peca: "lateral",
        }, bits, brocas));
      }
    }
  }
  return out;
}


// ───── Parafusos do fundo (modo sobreposto) ─────
import { resolverEspessuras as _re2 } from "./module";

export function calcularParafusosFundo(
  config: ModuleConfig,
  template: TemplateConfig,
  bits?: DrillBitLike[],
): Furo[] {
  if (config.fundo.modo !== "sobreposto") return [];
  const W = config.dims.width, H = config.dims.height;
  const espac = Math.max(50, config.fundo.espacamentoParafusoFundo ?? 250);
  const espF = config.fundo.espessura;
  const e = _re2(config.espessuraPadrao, config.espessuras);
  const { regras, brocas } = template;
  const diam = regras.diam_parafuso;
  const prof = regras.prof_cavilha;
  const out: Furo[] = [];

  const nH = Math.max(2, Math.ceil(W / espac));
  const nV = Math.max(2, Math.ceil(H / espac));
  const xs = Array.from({ length: nH }, (_, i) => (W * i) / (nH - 1));
  const ys = Array.from({ length: nV }, (_, i) => (H * i) / (nV - 1));
  const dir: Vec3 = [0, 0, -1];

  for (const x of xs) {
    out.push(makeFuro({ junta: "fundo_parafuso_tampo", tipo_furo: "parafuso",
      pos: [x, H - e.tampo / 2, espF], dir, diametro: diam, profundidade: prof, peca: "tampo" }, bits, brocas));
    out.push(makeFuro({ junta: "fundo_parafuso_base", tipo_furo: "parafuso",
      pos: [x, e.base / 2, espF], dir, diametro: diam, profundidade: prof, peca: "base" }, bits, brocas));
  }
  for (const y of ys) {
    out.push(makeFuro({ junta: "fundo_parafuso_lateral_esq", tipo_furo: "parafuso",
      pos: [e.lateral / 2, y, espF], dir, diametro: diam, profundidade: prof, peca: "lateral" }, bits, brocas));
    out.push(makeFuro({ junta: "fundo_parafuso_lateral_dir", tipo_furo: "parafuso",
      pos: [W - e.lateral / 2, y, espF], dir, diametro: diam, profundidade: prof, peca: "lateral" }, bits, brocas));
  }
  return out;
}
