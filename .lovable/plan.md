## Objetivo
Suporte fiel a roupeiros: novos tipos de secção (varão, maleiro aberto/fechado), gaveteiro interno (reusa secção `gavetas`), portas de correr (globais) com opção espelho, e página dedicada `/roupeiros` para construir o móvel completo.

Mantém o motor existente e os asserts a passar. Tudo opcional → módulos antigos inalterados.

---

## PARTE 1 — Motor (`module.ts`)

Estender `SecaoTipo`:
```
"nicho_aberto" | "porta" | "gavetas" | "varao" | "maleiro_aberto" | "maleiro_fechado"
```

Novas configs:
- `SecaoVaraoConfig { alturaVarao_mm?, prateleiraSuperior?: boolean, alturaPrateleira_mm? }`
- `SecaoMaleiroConfig { alturaPrateleira_mm?, nPrateleiras?: number }` (usado por aberto e fechado; fechado adiciona `nPortas?, ladoAbertura?, folga?` reutilizando `SecaoPortaConfig`)

Em `PortasConfig` adicionar bloco opcional `correr`:
```ts
correr?: {
  ativo: boolean;          // se true, ignora portas batentes do módulo + secções "porta"
  nFolhas: 2 | 3 | 4;
  espelho: "nenhum" | "todas" | "alternadas" | "apenas_uma";
  perfilEspessura_mm: number;   // perfil alumínio
  recuoFrente_mm: number;       // calha duas vias
  alturaCalhaSup_mm: number;
  alturaCalhaInf_mm: number;
}
```

Geração:
- `geraPecas`: se `portas.correr.ativo` → emite calha sup/inf (perfil alumínio, BOM), folhas (frente com perfil + painel melamina ou espelho conforme regra), e **não** gera portas batentes das secções `porta`. Secção `porta` com correr ativo torna-se equivalente a `nicho_aberto` estrutural (mantém divisórias).
- `varao`: emite item BOM "Varão Ø25 cromado" (comprimento = largura interna), 2 suportes; sem mesh estrutural extra além das divisórias.
- `maleiro_aberto`: prateleira fixa a `alturaPrateleira_mm` dentro da secção.
- `maleiro_fechado`: mesmo que `maleiro_aberto` + porta(s) batente(s) da secção (reutilizar pipeline da secção `porta`).
- Gaveteiro interno = secção `gavetas` normal mas com flag `interno?: boolean` em `SecaoGavetasConfig` → frente em material de carcaça, sem puxador (só altera BOM/aparência).

---

## PARTE 2 — Render (`Module3D.tsx`)

- Suporte a divisórias e prateleiras já existe; acrescentar:
  - **Varão**: cilindro horizontal Ø25 mm + 2 cilindros suporte nas laterais.
  - **Maleiro aberto/fechado**: prateleira fixa (reusa mesh prateleira).
  - **Portas de correr globais**: 2 folhas (ou n) à frente do módulo, animadas no eixo X (deslizam), com material espelho (MeshPhysicalMaterial reflectivo) quando aplicável; calhas sup/inf como barras finas. Quando correr ativo, suprimir meshes de portas batentes.
  - **Gaveteiro interno**: aplicar material da carcaça à frente da gaveta.

---

## PARTE 3 — UI nova `/roupeiros`

Nova rota `src/routes/_authenticated/roupeiros.tsx` + entry no menu lateral.

Layout:
1. **Cabeçalho do roupeiro**: nome, largura, altura, profundidade, espessura, material corpo/frente, pés/rodapé, tamponamentos.
2. **Sistema de portas (global)**:
   - Modo: `Sem portas` | `Batente por secção` | `Correr global`.
   - Se correr: nº folhas, espelho (nenhum/todas/alternadas/apenas uma), recuo, alturas das calhas.
3. **Empilhador de secções** (baixo→cima), drag-reorder, com tipos:
   - Gaveteiro (n gavetas, altura, corrediça, "interno" toggle)
   - Cabide / Varão (altura do varão, prateleira superior opcional)
   - Maleiro aberto (altura prateleira, nº prateleiras)
   - Maleiro fechado (idem + nº portas, lado abertura)
   - Nicho aberto (prateleiras móveis)
   - Secção porta batente (só se modo = batente por secção)
   - Sem porta / mesclar (= nicho_aberto)
   - Soma de alturas validada vs altura total (badge erro se mismatch).
4. **Preview 3D** ao lado (reusa `Module3D`).
5. Guardar como módulo na biblioteca + associar ao ambiente activo.

Editor existente em `/modulos` mantém os tipos novos disponíveis no card "Secções" (também ganha os novos selects), para uso pontual.

---

## PARTE 4 — Asserts (`module.assert.ts`)

- Regressão: cadeia completa passa; módulos sem `secoes` inalterados.
- Novo: secção `varao` gera 1 item BOM varão + 2 suportes; comprimento = largura interna.
- Novo: `maleiro_aberto` gera 1 prateleira fixa à altura definida; `maleiro_fechado` adiciona porta(s).
- Novo: `portas.correr.ativo=true` suprime portas batentes mesmo com secções `porta`; gera n folhas + 2 calhas; espelho="alternadas" ⇒ metade das folhas com material espelho.
- Novo: gaveta `interno=true` usa material carcaça e sem puxador.
- Novo: rota `/roupeiros` monta e cria módulo com >=3 secções (maleiro+varão+gaveteiro) corretamente.

---

## Entregável
- `/roupeiros` funcional com construção fiel (varão, maleiro aberto/fechado, gaveteiros internos, portas de correr com espelho, secções mistas sem porta).
- Editor genérico `/modulos` continua a oferecer as secções novas.
- Cadeia de asserts verde.