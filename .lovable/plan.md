
# Roupeiros — Colunas + correção de render

Objetivo: permitir dividir o roupeiro em **colunas verticais** (cada uma com largura em mm) onde cada coluna tem a sua **pilha de secções horizontais** (varão, maleiro aberto/fechado, gavetas, nicho, porta). Corrigir render quebrado (varão, prateleira maleiro, portas correr, divisórias).

---

## 1. Modelo de dados (motor `module.ts`)

Estender `ModuleConfig` com `colunas?: ColunaRoupeiro[]` (opcional, ativa quando presente):

```ts
type ColunaRoupeiro = {
  id: string;
  largura_mm: number;        // largura útil da coluna
  secoes: Secao[];           // mesma estrutura já existente
};
```

Regras:
- Se `colunas` existir e tiver ≥1 entrada → **ignora** `config.secoes` (uso legado: 1 coluna implícita).
- Soma das larguras + (N−1)·espessura da divisória vertical = `W − 2·lateral` (validação na UI, igual à de alturas).
- Cada coluna usa as helpers já existentes (`intervalosSecoes`, `dimensoesVaroes`, etc.) num **sub-espaço local** (x base + largura local).

Refactor mínimo: extrair de cada helper a versão "por intervalo X" para reutilizar entre coluna-única e multi-coluna; manter as APIs antigas para regressão.

### Novas geometrias
- **Divisória vertical** (peça `lateral`, descrição `Divisória vertical {n}`): full-height entre colunas, espessura = `e.lateral`, profundidade = D − folgas.
- Varões, prateleiras de maleiro, divisórias horizontais, gavetas, portas batente → emitidas **por coluna** (xMin/xMax locais).
- **Portas de correr globais**: continuam à frente de todas as colunas (não recortam por coluna).

## 2. Correções de render (`Module3D.tsx` + motor)

a) **Varão não aparece / posição errada**
   - Bug atual: `dimensoesVaroes` devolve mm; o render multiplica por `MM_TO_M`. OK em escala mas o cilindro tem `rotation [0,0,π/2]` (eixo Y→X) — manter, mas verificar que `xMin/xMax` agora são locais à coluna; o centro `cx = (xMin+xMax)/2` deve usar coordenadas absolutas do módulo. Garantir suportes nas laterais corretas da coluna.

b) **Prateleira do maleiro em falta**
   - Confirmado que `calcularGeometria` empurra `dimensoesMaleiroPrateleiras` mas o render só desenha peças quando geometria estrutural casa pelo `tipo`. Verificar que `tipo: "prateleira"` está na whitelist de render estrutural (sem filtro por descrição).

c) **Portas de correr partidas**
   - `cz` atual = `D + recuoFrente + perfilEspessura/2` coloca as folhas **à frente** do módulo. Sistema de coords tem frente em `z = D`, então deve ficar `z ≈ D + recuoFrente`. Ajustar: usar `D + recuoFrente − perfilEspessuraMm/2` para a via 0 (mais próxima do corpo) e somar `perfilEspessuraMm` à via 1.
   - Calhas: idem (centradas no mesmo z).
   - Animação: clamp do deslocamento ao curso real (folha−sobreposição), não a `W/n`.

d) **Divisórias entre secções em falta**
   - Engine já emite-as. O sintoma indica que vêm com tamanho 0 quando a soma `Σ altura + (N−1)·espPrateleira ≠ alturaInterna`. Auto-normalizar na UI: ao alterar a altura de uma secção, ajustar a última para fechar a soma (ou mostrar aviso e não emitir divisórias inválidas).

## 3. UI `/roupeiros.tsx`

Substituir o painel "Secções" por painel "Colunas":
- Lista de colunas com botões "+ Coluna", ↑/↓, lixo. Cada coluna mostra:
  - **Largura (mm)** com validação contra soma.
  - Cabeçalho com somatório de alturas vs altura interna (mantém badge verde/vermelho atual).
  - Pilha interna de secções (a mesma UI atual de secções, agora por coluna).
- Toolbar topo: "Adicionar coluna" e "Auto-distribuir larguras" (divide W útil em partes iguais).
- 3 colunas seed por defeito (1 com gavetas+varão+maleiro, 2 outras com varão+maleiro), para refletir o uso real.

## 4. Asserts (`module.assert.ts`)

- [regressão] Roupeiro sem `colunas` continua a funcionar (compat).
- [novo] `colunas`: soma das larguras + divisórias verticais === largura útil.
- [novo] Render emite N−1 divisórias verticais de altura H − tampo − base.
- [novo] Por coluna: somatório alturas + divisórias horizontais === altura interna.
- [novo] Portas de correr globais cobrem o módulo independentemente das colunas.

## 5. Entregável

Página `/roupeiros` com colunas configuráveis em mm, cada coluna com a sua pilha de secções horizontais (alturas independentes), render correto de varões/prateleiras de maleiro/portas de correr/divisórias verticais e horizontais. Asserts a verde.
