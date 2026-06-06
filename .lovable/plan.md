# Plano — MADEIRA MADEIRA (Fase 1: Fundação)

App de marcenaria paramétrica para Portugal. Esta fase entrega a base: autenticação, base de dados com RLS, app-shell navegável e página de Definições totalmente funcional. Sem editor 3D, sem motores de cálculo.

## 1. Base de Dados (Supabase + RLS)

Uma migration que cria os enums, tabelas e políticas RLS (cada utilizador só vê os seus dados). Trigger para criar `profiles` automaticamente no signup.

Tabelas: `profiles`, `settings`, `materials`, `edge_bands`, `hardware`, `drill_bits`, `drilling_templates`, `projects` — exatamente com os campos pedidos.

Enums: `hardware_category`, `pricing_unit`, `drill_purpose`, `project_type`, `project_status`.

Todas as tabelas com `GRANT` adequado a `authenticated` + `service_role`, RLS ativo, e policies `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.

Trigger `handle_new_user()` que insere em `profiles` e cria a linha default em `settings` ao registar.

## 2. Autenticação

- Página `/auth` (login + registo, tabs) usando `supabase.auth` (email+password).
- Listener `onAuthStateChange` no root.
- Toda a app fica sob `_authenticated/` (gate gerido pela integração) e redireciona para `/auth` se não houver sessão.
- Após login → `/projetos`.
- No registo pede `full_name` e (opcional) `company_name`, `nif`.

## 3. Design System

Tokens em `src/styles.css` (oklch):
- `--background` #F7F8FA, `--card` #FFF, `--foreground` #1A1D23, `--primary` #2563EB, `--border` cinza subtil, `--radius` 8px.
- Fonte Inter carregada via `<link>` no `__root.tsx`; classe utilitária `.tabular` com `font-variant-numeric: tabular-nums` aplicada a todos os inputs/labels numéricos.
- Sombras subtis, densidade tipo Linear/Figma.

## 4. App-Shell

`src/components/layout/`:
- `AppShell.tsx` — grelha sidebar + main com topbar.
- `Sidebar.tsx` — fixa à esquerda em desktop, drawer em mobile (Sheet do shadcn). Secções: Projetos, Materiais, Ferragens, Brocas, Templates de Furação, Definições. Item ativo destacado com o azul-técnico.
- `Topbar.tsx` — nome do projeto atual (placeholder por agora), avatar/menu com logout.
- Logo "MADEIRA MADEIRA" no topo da sidebar.

## 5. Rotas

Sob `src/routes/_authenticated/`:
- `projetos.tsx`, `materiais.tsx`, `ferragens.tsx`, `brocas.tsx`, `templates-furacao.tsx` → placeholders "Em construção" com ícone e copy consistentes.
- `definicoes.tsx` → **funcional**.

Públicas: `auth.tsx`, `index.tsx` (redirect para `/projetos` ou `/auth`).

## 6. Página Definições (funcional)

Form com:
- Moeda (select, default EUR — único option por agora).
- IVA % (input inteiro 0–100, default 23).
- Espessura padrão mm (select com 3,4,6,8,16,19,25; default 19).

Comportamento:
- Loader chama serverFn `getSettings` (cria default se não existir).
- Submit chama `updateSettings`, mostra toast "Definições guardadas" (sonner).
- Validação com zod, `react-hook-form`.
- Inputs com `tabular-nums` e sufixo "%" / "mm".

## 7. Constantes globais

`src/lib/constants/index.ts`:
- `UNIT = 'mm'`, `CURRENCY = 'EUR'`, `DEFAULT_IVA = 23`, `DEFAULT_THICKNESS = 19`.
- `ALLOWED_THICKNESSES = [3,4,6,8,16,19,25]`.
- `COLORS` (referência aos tokens).
- Locale `pt-PT` para formatação de moeda.

## 8. Estrutura de Pastas

```
src/
  components/
    ui/                    (shadcn existente)
    layout/                AppShell, Sidebar, Topbar
  routes/                  (rotas TanStack)
    _authenticated/
  lib/
    supabase/              (cliente já existe via integração)
    engines/README.md      ("Motores de cálculo: paramétrico, regras de ferragens, nesting, exportação MPR")
    constants/index.ts
    settings.functions.ts  (serverFns get/update)
```

## Detalhes técnicos

- Stack: TanStack Start (já configurado), não React Router.
- Server functions com `requireSupabaseAuth` para ler/gravar `settings`.
- Tipos Supabase regenerados após migration.
- Toda a UI em pt-PT (labels: "Definições", "Projetos", "Ferragens", "Brocas", "Materiais", "Templates de Furação", "Guardar", "Entrar", "Registar", etc.).
- Não implementar: editor 3D, paramétrico, nesting, MPR — `/src/lib/engines/` fica vazio com README.

## Fora do âmbito desta fase

CRUD de materiais/ferragens/brocas/templates, editor de projetos, cálculos, plano de corte, orçamentos, exportação. Ficam como placeholders navegáveis.
