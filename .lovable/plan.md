# Fase 2 — Motor Paramétrico do Módulo

## PASSO 0 — Verificação
Confirmar via `read_query` que `materials`, `edge_bands`, `hardware`, `drill_bits`, `settings` continuam intactos (contagem + RLS). Reportar no fim. Sem alterações.

## 1. Migration aditiva
Nova tabela `public.modules`:
- `id uuid PK`, `user_id uuid not null`
- `name text not null`
- `width_mm int`, `height_mm int`, `depth_mm int`
- `config jsonb not null default '{}'` — configuração completa de construção/espessuras/folgas/fundo
- `pieces jsonb not null default '[]'` — cache da última lista calculada
- `material_id uuid` (referência lógica a `materials.id`, nullable — sem FK rígida para evitar bloqueios em apagar materiais)
- `created_at`, `updated_at` + trigger `set_updated_at`
- GRANTs (authenticated + service_role), RLS `auth.uid() = user_id` (padrão das outras tabelas)

## 2. Motor de cálculo (puro, determinístico)
`src/lib/engines/module.ts`:

- Tipos: `PieceType`, `SistemaMontagem = 'laterais_cobrem' | 'tampo_base_cobrem'`, `FundoModo = 'sobreposto' | 'ranhura'`, `Peca`, `ModuleConfig`.
- Função pura `calcularPecas(config: ModuleConfig): Peca[]`.
- Fórmulas implementadas literalmente conforme especificação:
  - `laterais_cobrem`: laterais = H×D, tampo/base = (W−2·e_lat)×D, prateleira = (W−2·e_lat−folga)×(D−recuo).
  - `tampo_base_cobrem`: tampo/base = W×D, laterais = (H−e_tampo−e_base)×D.
  - Fundo sobreposto: W×H×e_fundo.
  - Fundo em ranhura: (W−2·e_lat+2·prof)×(H−e_tampo−e_base+2·prof)×e_fundo.
- Todas as medidas arredondadas a inteiro (`Math.round`) no fim.
- Regra "padrão + override": função `resolverEspessuras(padrao, overrides)` resolve cada peça.

## 3. Testes de sanidade
`src/lib/engines/module.assert.ts`: corre `console.assert` para o cenário W=800, H=720, D=560, todas 19mm, fundo sobreposto 4mm, 1 prateleira, folga 2mm, recuo 10mm. Verifica resultados exatos: Lateral 720×560×19, Tampo/Base 762×560×19, Prateleira 760×550×19, Fundo 800×720×4. Importado dinamicamente apenas em dev (`import.meta.env.DEV`) a partir do entry do cliente (`src/router.tsx`) para correr no arranque sem afetar produção.

## 4. Server functions
`src/lib/modules.functions.ts` (padrão `catalog.functions.ts`):
- `listModules`, `getModule(id)`, `upsertModule({id?, name, dims, config, pieces, material_id})`, `deleteModule(id)`.
- Todas com `requireSupabaseAuth` + validação zod.

## 5. UI — Página /modulos
Nova rota `src/routes/_authenticated/modulos.tsx` + entrada na sidebar (ícone `Box`, antes de "Materiais").

Layout desktop: grelha 2 colunas (`lg:grid-cols-[1fr_1.2fr]`). Mobile: colunas empilhadas.

**Coluna esquerda — Painel de configuração** (componentes pequenos):
- Cabeçalho com Nome (input) + botão "Guardar módulo".
- Card "Dimensões": 3 controlos (W/H/D) cada um com slider + input numérico sincronizados (mm inteiros, min/max razoáveis 100–3000).
- Card "Construção": SELECT sistema de montagem + SELECT material (lista do catálogo).
- Card "Espessuras": input espessura padrão; bloco colapsável "Ajustar por peça" com 4 inputs opcionais (lateral/tampo/base/prateleira).
- Card "Prateleiras": nº prateleiras (int), folga lateral, recuo frontal.
- Card "Fundo": SELECT modo, espessura (default 4mm), prof. ranhura, recuo.

**Coluna direita — Tabela de peças**:
- Cabeçalho sticky com nome do módulo.
- `<Table>` com colunas Peça / Qtd / Comprimento / Largura / Espessura / Veio (tabular-nums, sufixo "mm").
- Rodapé: total de peças e área total m² (Σ qtd·C·L / 1 000 000).
- Estado vazio quando dims inválidas (ex: tampo ≤ 0) → mostra aviso.

**Recálculo em tempo real**: `useMemo(() => calcularPecas(config), [config])` — atualiza a cada keystroke/slider, sem botão.

**Lista de módulos guardados**: barra horizontal no topo da página com cards pequenos (nome + dims) carregados via `useQuery(['modules'])`. Clicar → carrega no painel. Ícone para apagar (ConfirmDelete reutilizado).

## Não inclui
3D, portas/dobradiças, gavetas, furação automática, nesting, MPR, orçamento.

## Entregável
- Migration `modules` aplicada com RLS.
- `module.ts` motor puro + asserts em dev.
- `/modulos` operacional: configurar → recalcular instantaneamente → guardar/carregar/apagar.
- Relatório de PASSO 0 e dos `console.assert` na resposta final.
