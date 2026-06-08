import { calcularParedes, calcularAberturasDaParede, validarAbertura, normalizarRoom, DEFAULT_ROOM, type Abertura } from "./ambiente";

export function runAmbienteAsserts() {
  const sala = { ...DEFAULT_ROOM, largura: 3000, profundidade: 2000, altura: 2400, espessuraParede: 100, aberturas: [] };
  const paredes = calcularParedes(sala);
  const fundo = paredes.find((p) => p.id === "fundo")!;
  const esq = paredes.find((p) => p.id === "esquerda")!;
  console.assert(
    fundo.size[0] === 3000 && fundo.size[1] === 2400 && fundo.size[2] === 100,
    "[ambiente] parede fundo size",
  );
  console.assert(
    esq.size[0] === 100 && esq.size[1] === 2400 && esq.size[2] === 2000,
    "[ambiente] parede esquerda size",
  );

  // Abertura válida
  const abValida: Abertura = { id: "a1", paredeId: "fundo", tipo: "janela", x: 1000, y: 900, largura: 1200, altura: 1000 };
  const salaComJanela = { ...sala, aberturas: [abValida] };
  const calc = calcularAberturasDaParede(salaComJanela, "fundo");
  console.assert(
    calc.length === 1 && calc[0].u === 1000 && calc[0].v === 900 && calc[0].largura === 1200 && calc[0].altura === 1000 && calc[0].valido,
    "[ambiente] abertura válida no fundo",
  );

  // Abertura inválida
  const abInv: Abertura = { id: "a2", paredeId: "fundo", tipo: "janela", x: 2500, y: 900, largura: 1200, altura: 1000 };
  const vInv = validarAbertura(sala, abInv);
  console.assert(!vInv.valido, "[ambiente] abertura inválida (excede comprimento)");

  // Cores default
  console.assert(DEFAULT_ROOM.corParede === "#EDEAE4", "[ambiente] corParede default #EDEAE4");
  console.assert(DEFAULT_ROOM.corChao === "#D9D6D0", "[ambiente] corChao default #D9D6D0");
  const norm = normalizarRoom({});
  console.assert(norm.corParede === "#EDEAE4" && norm.corChao === "#D9D6D0", "[ambiente] normalizarRoom aplica cores default");
  // Alterar cor propaga
  const custom = normalizarRoom({ corParede: "#112233", corChao: "#445566" });
  console.assert(custom.corParede === "#112233" && custom.corChao === "#445566", "[ambiente] cores personalizadas persistem");
}

