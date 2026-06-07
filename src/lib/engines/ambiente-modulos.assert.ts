import { transformColocacao } from "./ambiente-modulos";

const SALA = { largura: 3000, profundidade: 2000, altura: 2400 };
const MOD = { width: 800, height: 720, depth: 560 };

export function runAmbienteModulosAsserts() {
  const eps = 1e-6;
  const tFundo = transformColocacao({ parede: "fundo", x_offset_mm: 0, altura_chao_mm: 0 }, MOD, SALA);
  console.assert(Math.abs(tFundo.rotationY) < eps, "[amb-mod] fundo rotação=0", tFundo);
  console.assert(tFundo.position[0] === 0 && tFundo.position[2] === 0, "[amb-mod] fundo back em z=0 e x=0", tFundo.position);

  const tEsq = transformColocacao({ parede: "esquerda", x_offset_mm: 100, altura_chao_mm: 0 }, MOD, SALA);
  console.assert(Math.abs(tEsq.rotationY - Math.PI / 2) < eps, "[amb-mod] esquerda rotação=+90°", tEsq);

  const tDir = transformColocacao({ parede: "direita", x_offset_mm: 0, altura_chao_mm: 0 }, MOD, SALA);
  console.assert(Math.abs(tDir.rotationY + Math.PI / 2) < eps, "[amb-mod] direita rotação=-90°", tDir);
  console.assert(tDir.position[0] === SALA.largura, "[amb-mod] direita x=L", tDir.position);

  const tHigh = transformColocacao({ parede: "fundo", x_offset_mm: 0, altura_chao_mm: 1400 }, MOD, SALA);
  console.assert(tHigh.position[1] === 1400, "[amb-mod] altura_chao=1400 → Y=1400", tHigh.position);

  // Clamp/excede: módulo 800 numa parede de 2000 com offset 1500 → excede
  const tEx = transformColocacao({ parede: "esquerda", x_offset_mm: 1500, altura_chao_mm: 0 }, MOD, SALA);
  console.assert(tEx.excede === true, "[amb-mod] avisa quando ultrapassa parede");
}
