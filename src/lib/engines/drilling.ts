// Motor de furação — função pura e determinística.
// X=W, Y=H, Z=D. Sistema 'laterais_cobrem' apenas.

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
  }
}
function profundidadePara(t: TipoFuro, regras: TemplateConfig["regras"]): number {
  switch (t) {
    case "cavilha":
    case "parafuso":
    case "minifix_perno": return regras.prof_cavilha;
    case "minifix_corpo": return regras.prof_minifix;
    case "dobradica": return regras.prof_minifix;
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
  const passanteExpected = false; // todas as ops atuais são não-passantes
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.001;
  if (bits && bits.length > 0) {
    // 1) match exato
    const exact = bits.find(b =>
      b.purpose === purpose &&
      eq(Number(b.diameter_mm), diametro) &&
      (b.tool_type ?? "broca") === "broca" &&
      Boolean(b.passante) === passanteExpected
    );
    if (exact) return { id: exact.id, nome: exact.name, tool_type: exact.tool_type ?? "broca" };
    // 2) match purpose+diâmetro
    const looser = bits.find(b => b.purpose === purpose && eq(Number(b.diameter_mm), diametro));
    if (looser) return { id: looser.id, nome: looser.name, tool_type: looser.tool_type ?? "broca" };
    // 3) match purpose
    const purposeOnly = bits.find(b => b.purpose === purpose);
    if (purposeOnly) return { id: purposeOnly.id, nome: purposeOnly.name, tool_type: purposeOnly.tool_type ?? "broca" };
  }
  // 4) fallback ao template
  const tplKey: keyof TemplateConfig["brocas"] =
    t === "cavilha" ? "cavilha" :
    t === "minifix_corpo" ? "minifix_corpo" :
    t === "minifix_perno" ? "minifix_perno" :
    t === "parafuso" ? "parafuso" : "dobradica";
  const tplId = templateBrocas?.[tplKey] ?? null;
  if (tplId && bits) {
    const tb = bits.find(b => b.id === tplId);
    if (tb) return { id: tb.id, nome: tb.name, tool_type: tb.tool_type ?? "broca" };
  }
  // 5) último recurso: nome sintético
  const nome =
    t === "cavilha" ? `Broca cavilha Ø${diametro}` :
    t === "minifix_corpo" ? `Broca minifix corpo Ø${diametro}` :
    t === "minifix_perno" ? `Broca minifix perno Ø${diametro}` :
    t === "parafuso" ? `Broca pré-furo Ø${diametro}` :
    `Broca dobradiça Ø${diametro}`;
  return { id: tplId ?? null, nome, tool_type: "broca" };
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

export function calcularFuros(
  config: ModuleConfig,
  template: TemplateConfig,
  bits?: DrillBitLike[],
): Furo[] {
  if (config.sistemaMontagem !== "laterais_cobrem") return [];
  const { dims, espessuraPadrao, espessuras, nPrateleiras } = config;
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

  type JuntaDef = { nome: string; yJunta: number; xFace: number; sinalLateral: 1 | -1; pecaH: PieceType; };
  const juntas: JuntaDef[] = [];
  const yTampo = H - e.tampo / 2;
  juntas.push({ nome: "lateral_esq↔tampo", yJunta: yTampo, xFace: e.lateral, sinalLateral: 1, pecaH: "tampo" });
  juntas.push({ nome: "lateral_dir↔tampo", yJunta: yTampo, xFace: W - e.lateral, sinalLateral: -1, pecaH: "tampo" });
  const yBase = e.base / 2;
  juntas.push({ nome: "lateral_esq↔base", yJunta: yBase, xFace: e.lateral, sinalLateral: 1, pecaH: "base" });
  juntas.push({ nome: "lateral_dir↔base", yJunta: yBase, xFace: W - e.lateral, sinalLateral: -1, pecaH: "base" });
  if (nPrateleiras > 0) {
    const innerBottom = e.base;
    const innerHeight = H - e.base - e.tampo;
    for (let i = 1; i <= nPrateleiras; i++) {
      const cy = innerBottom + (innerHeight * i) / (nPrateleiras + 1);
      juntas.push({ nome: `lateral_esq↔prateleira${i}`, yJunta: cy, xFace: e.lateral, sinalLateral: 1, pecaH: "prateleira" });
      juntas.push({ nome: `lateral_dir↔prateleira${i}`, yJunta: cy, xFace: W - e.lateral, sinalLateral: -1, pecaH: "prateleira" });
    }
  }

  const furos: Furo[] = [];
  const push2 = (
    junta: string,
    tFace: TipoFuro, tTopo: TipoFuro,
    j: JuntaDef, z: number,
  ) => {
    furos.push(makeFuro({
      junta, tipo_furo: tFace,
      pos: [j.xFace, j.yJunta, z],
      dir: [-j.sinalLateral as number, 0, 0] as Vec3,
      diametro: diametroPara(tFace, regras),
      profundidade: profundidadePara(tFace, regras),
      peca: "lateral",
    }, bits, brocas));
    furos.push(makeFuro({
      junta, tipo_furo: tTopo,
      pos: [j.xFace, j.yJunta, z],
      dir: [j.sinalLateral as number, 0, 0] as Vec3,
      diametro: diametroPara(tTopo, regras),
      profundidade: profundidadePara(tTopo, regras),
      peca: j.pecaH,
    }, bits, brocas));
  };

  for (const j of juntas) {
    for (let k = 0; k < n; k++) {
      const papel = papeis[k];
      const z = zs[k];
      const tF = tipoNaFace(papel);
      const tT = tipoNoTopo(papel);
      push2(j.nome, tF, tT, j, z);

      // Cavilha companheira para cada minifix (a 32mm, em direção ao centro da junta)
      if (papel === "minifix") {
        let zComp = z + (z < D / 2 ? dz : -dz);
        if (zComp < zMin || zComp > zMax) zComp = z + (z < D / 2 ? -dz : dz);
        if (zComp < zMin) zComp = zMin;
        if (zComp > zMax) zComp = zMax;
        push2(`${j.nome}_cav`, "cavilha", "cavilha", j, zComp);
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
  const diam = regras.diam_parafuso;
  const prof = regras.prof_cavilha;
  const out: Furo[] = [];

  for (const c of caixas) {
    const zF = c.zFront - regras.recuo_frontal;
    const zB = c.zBack + regras.recuo_frontal;
    const zM = (c.zBack + c.zFront) / 2;
    const zs = [zB, zM, zF];
    const y = c.center[1];
    for (const lado of ["esq", "dir"] as const) {
      const xFace = lado === "esq" ? e.lateral : W - e.lateral;
      const dir: Vec3 = lado === "esq" ? [-1, 0, 0] : [1, 0, 0];
      for (const z of zs) {
        out.push(makeFuro({
          junta: `corredica_gaveta${c.idx + 1}_${lado}`,
          tipo_furo: "parafuso",
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

export function contarCorredicas(config: ModuleConfig): number {
  return dimensoesGavetas(config).caixas.length * 2;
}
