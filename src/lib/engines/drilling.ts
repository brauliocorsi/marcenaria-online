// Motor de furação — função pura e determinística.
// Sistema de coordenadas idêntico a calcularGeometria: X=largura (0..W),
// Y=altura (0..H), Z=profundidade (0..D), origem num canto.
//
// Suporta sistema de montagem 'laterais_cobrem'. Para 'tampo_base_cobrem'
// devolve [] (TODO em fase futura).

import { resolverEspessuras, dimensoesPortas, posicoesDobradicasY, type ModuleConfig, type PieceType, type Vec3 } from "./module";
import type { TemplateConfig } from "@/lib/drilling.functions";

export type TipoFuro = "cavilha" | "minifix_corpo" | "minifix_perno" | "parafuso" | "dobradica";

export interface Furo {
  junta: string;
  tipo_furo: TipoFuro;
  pos: Vec3;
  dir: Vec3;
  diametro: number;
  profundidade: number;
  peca: PieceType;
}

type Papel = "cavilha" | "minifix" | "parafuso";

function papeisPorJunta(sistema: TemplateConfig["sistemaUniao"], nIn: number): Papel[] {
  // Garante ≥1 interior quando o sistema principal usa minifix/parafuso
  let n = nIn;
  if ((sistema === "minifix_cavilha" || sistema === "cavilha_parafuso" || sistema === "parafuso_cavilha") && n === 2) {
    n = 3;
  }
  const r: Papel[] = new Array(n).fill("cavilha");
  if (n === 1) {
    r[0] = sistema === "parafuso_direto" ? "parafuso" : "cavilha";
    return r;
  }
  for (let k = 0; k < n; k++) {
    const extremo = k === 0 || k === n - 1;
    if (sistema === "parafuso_direto") r[k] = "parafuso";
    else if (extremo) r[k] = "cavilha";
    else if (sistema === "minifix_cavilha") r[k] = "minifix";
    else r[k] = "parafuso"; // cavilha_parafuso / parafuso_cavilha
  }
  return r;
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
    case "minifix_perno":
      return regras.prof_cavilha;
    case "minifix_corpo":
      return regras.prof_minifix;
    case "dobradica":
      return regras.prof_minifix; // padrão 13mm
  }
}

function posicoesZ(D: number, n: number, recuo: number): number[] {
  if (n <= 1) return [D / 2];
  const span = D - 2 * recuo;
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(recuo + (k * span) / (n - 1));
  return out;
}

export function calcularFuros(config: ModuleConfig, template: TemplateConfig): Furo[] {
  if (config.sistemaMontagem !== "laterais_cobrem") return []; // TODO: tampo_base_cobrem
  const { dims, espessuraPadrao, espessuras, folgas, nPrateleiras } = config;
  const W = dims.width, H = dims.height, D = dims.depth;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  const { regras, sistemaUniao } = template;

  const L = D;
  const nBase = Math.max(regras.conectores_min, Math.ceil(L / regras.conectores_por_mm));
  const papeis = papeisPorJunta(sistemaUniao, nBase);
  const n = papeis.length;
  const zs = posicoesZ(D, n, regras.recuo_extremidade);

  const furos: Furo[] = [];

  // Define as 6 juntas: cada uma tem
  //   yJunta = y do centro do painel horizontal (tampo/base/prateleira)
  //   xFace = x da face interna da lateral
  //   pecaLateral, pecaHorizontal, descricao
  type JuntaDef = {
    nome: string;
    yJunta: number;
    xFace: number;
    sinalLateral: 1 | -1; // 1 = lateral esquerda (face vira para +X), -1 = direita (face vira para -X)
    pecaH: PieceType;
  };

  const juntas: JuntaDef[] = [];

  // tampo: y = H - e.tampo/2
  const yTampo = H - e.tampo / 2;
  juntas.push({ nome: "lateral_esq↔tampo", yJunta: yTampo, xFace: e.lateral, sinalLateral: 1, pecaH: "tampo" });
  juntas.push({ nome: "lateral_dir↔tampo", yJunta: yTampo, xFace: W - e.lateral, sinalLateral: -1, pecaH: "tampo" });

  // base: y = e.base/2
  const yBase = e.base / 2;
  juntas.push({ nome: "lateral_esq↔base", yJunta: yBase, xFace: e.lateral, sinalLateral: 1, pecaH: "base" });
  juntas.push({ nome: "lateral_dir↔base", yJunta: yBase, xFace: W - e.lateral, sinalLateral: -1, pecaH: "base" });

  // prateleiras (igual à fórmula de calcularGeometria)
  if (nPrateleiras > 0) {
    const innerBottom = e.base;
    const innerHeight = H - e.base - e.tampo;
    void folgas;
    for (let i = 1; i <= nPrateleiras; i++) {
      const cy = innerBottom + (innerHeight * i) / (nPrateleiras + 1);
      juntas.push({ nome: `lateral_esq↔prateleira${i}`, yJunta: cy, xFace: e.lateral, sinalLateral: 1, pecaH: "prateleira" });
      juntas.push({ nome: `lateral_dir↔prateleira${i}`, yJunta: cy, xFace: W - e.lateral, sinalLateral: -1, pecaH: "prateleira" });
    }
  }

  for (const j of juntas) {
    for (let k = 0; k < n; k++) {
      const papel = papeis[k];
      const z = zs[k];

      // Furo na FACE da lateral — direção entra na lateral (oposto ao sinal)
      const tFace = tipoNaFace(papel);
      furos.push({
        junta: j.nome,
        tipo_furo: tFace,
        pos: [j.xFace, j.yJunta, z],
        dir: [-j.sinalLateral as number, 0, 0] as Vec3,
        diametro: diametroPara(tFace, regras),
        profundidade: profundidadePara(tFace, regras),
        peca: "lateral",
      });

      // Furo no TOPO do painel horizontal — direção entra no painel (sentido oposto ao furo da lateral)
      const tTopo = tipoNoTopo(papel);
      furos.push({
        junta: j.nome,
        tipo_furo: tTopo,
        pos: [j.xFace, j.yJunta, z],
        dir: [j.sinalLateral as number, 0, 0] as Vec3,
        diametro: diametroPara(tTopo, regras),
        profundidade: profundidadePara(tTopo, regras),
        peca: j.pecaH,
      });
    }
  }

  return furos;
}

// ─────────────────────────────────────────────────────────────
// Dobradiças — canecos Ø35 na porta + chapas (2 parafusos) na lateral.
// ─────────────────────────────────────────────────────────────

const RECUO_CANECO = 22;      // mm da aresta da porta ao centro do caneco
const RECUO_FRENTE_CHAPA = 37; // mm da frente (Z=D) ao centro dos furos da chapa
const SEP_CHAPA_Y = 32;        // separação vertical entre os 2 parafusos da chapa

export function calcularDobradicas(config: ModuleConfig, template: TemplateConfig): Furo[] {
  const portas = dimensoesPortas(config);
  if (portas.length === 0) return [];
  const { regras } = template;
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const W = config.dims.width;
  const diamParafuso = regras.diam_parafuso;
  const profParafuso = regras.prof_cavilha;
  const diamCaneco = 35;
  const profCaneco = regras.prof_minifix;
  const out: Furo[] = [];

  for (const p of portas) {
    const ys = posicoesDobradicasY(p);
    // x do caneco (distância recuo_caneco do lado das dobradiças, para dentro da porta)
    const xCaneco = p.ladoDobradicas === "esquerda"
      ? p.xCharneira + RECUO_CANECO
      : p.xCharneira - RECUO_CANECO;
    // x face interna da lateral correspondente + direção (para dentro do material)
    const xFaceLateral = p.ladoDobradicas === "esquerda" ? e.lateral : W - e.lateral;
    const dirLateral: Vec3 = p.ladoDobradicas === "esquerda" ? [-1, 0, 0] : [1, 0, 0];
    // direção do caneco: entra na porta a partir da face traseira (zBack), em direção a zFront
    const dirCaneco: Vec3 = [0, 0, 1]; // sempre +Z (zBack < zFront em ambos os modos)

    const zChapa = config.dims.depth - RECUO_FRENTE_CHAPA;

    for (const y of ys) {
      // Caneco na porta
      out.push({
        junta: `dobradica_${p.descricao}`,
        tipo_furo: "dobradica",
        pos: [xCaneco, y, p.zBack],
        dir: dirCaneco,
        diametro: diamCaneco,
        profundidade: profCaneco,
        peca: "porta",
      });
      // Chapa: 2 parafusos na face interna da lateral
      for (const dy of [-SEP_CHAPA_Y / 2, SEP_CHAPA_Y / 2]) {
        out.push({
          junta: `dobradica_chapa_${p.descricao}`,
          tipo_furo: "parafuso",
          pos: [xFaceLateral, y + dy, zChapa],
          dir: dirLateral,
          diametro: diamParafuso,
          profundidade: profParafuso,
          peca: "lateral",
        });
      }
    }
  }

  return out;
}


// ─────────────────────────────────────────────────────────────
// Corrediças — furação dos pontos de fixação na lateral da carcaça.
// 3 parafusos por lateral por gaveta (frente / meio / trás).
// ─────────────────────────────────────────────────────────────

import { dimensoesGavetas } from "./module";

export function calcularCorredicas(config: ModuleConfig, template: TemplateConfig): Furo[] {
  const { caixas } = dimensoesGavetas(config);
  if (caixas.length === 0) return [];
  const { regras } = template;
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
        out.push({
          junta: `corredica_gaveta${c.idx + 1}_${lado}`,
          tipo_furo: "parafuso",
          pos: [xFace, y, z],
          dir,
          diametro: diam,
          profundidade: prof,
          peca: "lateral",
        });
      }
    }
  }
  return out;
}

export function contarCorredicas(config: ModuleConfig): number {
  return dimensoesGavetas(config).caixas.length * 2;
}
