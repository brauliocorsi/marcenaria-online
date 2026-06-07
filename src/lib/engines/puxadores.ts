// Motor puro de PUXADORES + GOLAS.
// Independente da forma como é guardado na BD; recebe um snapshot
// { tipo, config } + a "frente" alvo (porta ou frente de gaveta) e
// devolve a maquinaçao real: encurtamento (gola), furos passantes
// (convencional), fresagem (cava), perfis de gola e furos de fixaçao.

export type PuxadorTipo = "convencional" | "cava" | "gola_j" | "gola_c";
export type PuxadorPosicao = "superior" | "inferior" | "lateral";

export interface PuxadorBarraCfg {
  subtipo: "barra";
  entreEixo: number; // mm
  furoØ: number;     // mm
  alturaDoBordo: number; // mm
}
export interface PuxadorBotaoCfg {
  subtipo: "botao";
  furoØ: number;
  alturaDoBordo: number;
}
export type PuxadorConvCfg = PuxadorBarraCfg | PuxadorBotaoCfg;

export interface PuxadorCavaCfg {
  posicao?: PuxadorPosicao;
  cavaLargura: number;       // mm (no sentido perpendicular ao bordo)
  deixarEspessura: number;   // mm — material remanescente após fresar
}
export interface PuxadorGolaCfg {
  reveal: number;        // mm — frente encurta este valor
  perfilLargura: number; // mm — secção do perfil
  perfilProf: number;    // mm — profundidade do perfil
}

export interface PuxadorSnapshot {
  id?: string;
  nome?: string;
  tipo: PuxadorTipo;
  config: PuxadorConvCfg | PuxadorCavaCfg | PuxadorGolaCfg;
}

// ── Defaults / seeds ─────────────────────────────────────────────────────
export const PUXADORES_DEFAULT: Array<{ nome: string; tipo: PuxadorTipo; fabricante?: string; config: any }> = [
  { nome: "Puxador barra 128", tipo: "convencional", config: { subtipo: "barra", entreEixo: 128, furoØ: 5, alturaDoBordo: 50 } },
  { nome: "Botão Ø30",        tipo: "convencional", config: { subtipo: "botao", furoØ: 5, alturaDoBordo: 50 } },
  { nome: "Cava superior",    tipo: "cava",         config: { posicao: "superior", cavaLargura: 30, deixarEspessura: 8 } },
  { nome: "Gola J 40",        tipo: "gola_j",       config: { reveal: 40, perfilLargura: 20, perfilProf: 20 } },
  { nome: "Gola C 40",        tipo: "gola_c",       config: { reveal: 40, perfilLargura: 20, perfilProf: 24 } },
];

export const PUXADOR_TIPO_LABEL: Record<PuxadorTipo, string> = {
  convencional: "Convencional",
  cava: "Cava",
  gola_j: "Gola J",
  gola_c: "Gola C",
};

// ── Util: encurtamento por reveal (gola) ─────────────────────────────────
export function revealOfPuxador(p?: PuxadorSnapshot | null): number {
  if (!p) return 0;
  if (p.tipo === "gola_j" || p.tipo === "gola_c") {
    return Math.max(0, (p.config as PuxadorGolaCfg).reveal ?? 0);
  }
  return 0;
}

// ── Saída do motor por frente ────────────────────────────────────────────
export interface PuxadorFuro {
  ref: string;
  /** Posiçao [x, y, z] em coords do módulo (peca = frente) */
  pos: [number, number, number];
  /** Direçao (geralmente eixo Z, frente → trás) */
  dir: [number, number, number];
  diametro: number;
  profundidade: number; // mm; passante => >= espessura da frente
  passante: boolean;
}

export interface PuxadorFresagem {
  ref: string;
  /** Bordo da frente afetado */
  bordo: PuxadorPosicao;
  comprimento: number; // largura da frente
  largura: number;     // cavaLargura
  profundidade: number; // = e_frente - deixarEspessura
}

export interface PuxadorPerfilGola {
  ref: string;
  tipo: "J" | "C";
  comprimento: number;       // = largura do módulo (W)
  perfilLargura: number;
  perfilProf: number;
  /** Posiçao central do perfil em coords do módulo */
  centro: [number, number, number];
  /** Furos de fixaçao na carcaça (Ø4 — extremos + meio) */
  furosFixacao: Array<{ pos: [number, number, number]; diametro: number; profundidade: number }>;
}

export interface FrenteAlvo {
  /** Coords do módulo */
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  zFront: number; zBack: number;
  cx: number; cy: number; cz: number;
  largura: number; altura: number; espessura: number;
  /** identificador legível: "Porta" / "Frente gaveta 2" */
  descricao: string;
}

export interface MaquinacaoPuxador {
  furos: PuxadorFuro[];
  fresagens: PuxadorFresagem[];
  perfis: PuxadorPerfilGola[];
}

/**
 * Calcula a maquinaçao real para uma frente (porta ou frente de gaveta) com um
 * puxador. A frente já vem com o encurtamento aplicado (caller passa a frente
 * "final"); a gola só gera perfil + furos de fixaçao na carcaça (W do módulo).
 */
export function maquinarPuxador(
  pux: PuxadorSnapshot | null | undefined,
  frente: FrenteAlvo,
  posicao: PuxadorPosicao,
  moduloW: number,
): MaquinacaoPuxador {
  const out: MaquinacaoPuxador = { furos: [], fresagens: [], perfis: [] };
  if (!pux) return out;

  // bordo de referência (Y) consoante posiçao
  const yBordo = posicao === "superior" ? frente.yMax
                : posicao === "inferior" ? frente.yMin
                : (frente.yMin + frente.yMax) / 2;
  const sinal = posicao === "superior" ? -1 : 1; // para "alturaDoBordo" entrar para dentro

  if (pux.tipo === "convencional") {
    const c = pux.config as PuxadorConvCfg;
    const dirIn: [number, number, number] = [0, 0, -1]; // de frente para trás
    if (c.subtipo === "barra") {
      const yFuro = yBordo + sinal * c.alturaDoBordo;
      const cxF = (frente.xMin + frente.xMax) / 2;
      const x1 = cxF - c.entreEixo / 2;
      const x2 = cxF + c.entreEixo / 2;
      out.furos.push(
        { ref: "barra_furo_1", pos: [x1, yFuro, frente.zFront], dir: dirIn, diametro: c.furoØ, profundidade: frente.espessura, passante: true },
        { ref: "barra_furo_2", pos: [x2, yFuro, frente.zFront], dir: dirIn, diametro: c.furoØ, profundidade: frente.espessura, passante: true },
      );
    } else {
      const yFuro = yBordo + sinal * c.alturaDoBordo;
      const cxF = (frente.xMin + frente.xMax) / 2;
      out.furos.push(
        { ref: "botao_furo", pos: [cxF, yFuro, frente.zFront], dir: dirIn, diametro: c.furoØ, profundidade: frente.espessura, passante: true },
      );
    }
    return out;
  }

  if (pux.tipo === "cava") {
    const c = pux.config as PuxadorCavaCfg;
    const prof = Math.max(1, frente.espessura - c.deixarEspessura);
    out.fresagens.push({
      ref: `cava_${posicao}`, bordo: posicao,
      comprimento: frente.largura, largura: c.cavaLargura, profundidade: prof,
    });
    return out;
  }

  // gola_j / gola_c — frente JÁ vem encurtada (caller aplicou reveal).
  const c = pux.config as PuxadorGolaCfg;
  const tipoLetra = pux.tipo === "gola_j" ? "J" : "C";
  // perfil colocado no vão do reveal (entre a frente encurtada e o tampo/base)
  const yPerfil = posicao === "superior" ? frente.yMax + c.reveal / 2
                : posicao === "inferior" ? frente.yMin - c.reveal / 2
                : (frente.yMin + frente.yMax) / 2;
  const zPerfil = frente.zFront - c.perfilProf / 2;
  const centro: [number, number, number] = [moduloW / 2, yPerfil, zPerfil];
  const xs = [10, moduloW / 2, moduloW - 10]; // extremos + meio
  const furosFix = xs.map((x) => ({
    pos: [x, yPerfil, frente.zBack] as [number, number, number],
    diametro: 4, profundidade: 15,
  }));
  out.perfis.push({
    ref: `gola_${tipoLetra}_${posicao}`,
    tipo: tipoLetra as "J" | "C",
    comprimento: moduloW, perfilLargura: c.perfilLargura, perfilProf: c.perfilProf,
    centro, furosFixacao: furosFix,
  });
  return out;
}

// ─── Asserts ─────────────────────────────────────────────────────────────
export function runPuxadoresAsserts() {
  // Frente de referência: porta 800x720x19, sobreposta, frente em z=560..579.
  const frente: FrenteAlvo = {
    xMin: 2, xMax: 798, yMin: 2, yMax: 718, zBack: 560, zFront: 579,
    cx: 400, cy: 360, cz: 569.5, largura: 796, altura: 716, espessura: 19,
    descricao: "Porta",
  };
  const W = 800;

  // [novo] convencional barra: 2 furos passantes, separação === entreEixo
  const barra: PuxadorSnapshot = { tipo: "convencional",
    config: { subtipo: "barra", entreEixo: 128, furoØ: 5, alturaDoBordo: 50 } };
  const mBarra = maquinarPuxador(barra, frente, "superior", W);
  const dist = Math.abs(mBarra.furos[1].pos[0] - mBarra.furos[0].pos[0]);
  const okBarra = mBarra.furos.length === 2 && mBarra.furos.every(f => f.passante && f.diametro === 5)
    && Math.abs(dist - 128) < 0.01;

  // [novo] cava: 1 operaçao, prof === e_frente − deixarEspessura
  const cava: PuxadorSnapshot = { tipo: "cava",
    config: { posicao: "superior", cavaLargura: 30, deixarEspessura: 8 } };
  const mCava = maquinarPuxador(cava, frente, "superior", W);
  const okCava = mCava.fresagens.length === 1 && mCava.furos.length === 0
    && Math.abs(mCava.fresagens[0].profundidade - (19 - 8)) < 0.01
    && mCava.fresagens[0].comprimento === frente.largura;

  // [novo] gola_j: existe perfil com comprimento === W, 3 furos de fixaçao
  const golaJ: PuxadorSnapshot = { tipo: "gola_j",
    config: { reveal: 40, perfilLargura: 20, perfilProf: 20 } };
  const mGola = maquinarPuxador(golaJ, frente, "superior", W);
  const okGola = mGola.perfis.length === 1
    && mGola.perfis[0].comprimento === W
    && mGola.perfis[0].furosFixacao.length === 3
    && revealOfPuxador(golaJ) === 40;

  // [novo] sem puxador: frente inalterada (regressão)
  const mNull = maquinarPuxador(null, frente, "superior", W);
  const okNull = mNull.furos.length === 0 && mNull.fresagens.length === 0
    && mNull.perfis.length === 0 && revealOfPuxador(null) === 0;

  // [novo] convencional (regressão): nenhum perfil/fresagem gerado
  const okConvOnlyFuros = mBarra.fresagens.length === 0 && mBarra.perfis.length === 0;

  const tests: Array<[string, boolean]> = [
    ["[novo] convencional barra: 2 furos passantes Ø5 separação 128", okBarra],
    ["[novo] cava: 1 fresagem, prof = 19−8 = 11mm", okCava],
    ["[novo] gola_j: perfil comprimento=W, 3 furos fixaçao, reveal=40", okGola],
    ["[novo] sem puxador: zero operaçoes (regressão)", okNull],
    ["[novo] convencional: nenhuma fresagem/perfil", okConvOnlyFuros],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[puxadores.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info("[puxadores.assert] ✓ 5 testes (convencional/cava/gola/null) — OK.");
  return ok;
}
