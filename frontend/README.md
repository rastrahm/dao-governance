# DAO Governance Frontend

Next.js 15 (App Router) · tema claro/oscuro · perfiles Observador / Holder / Proponente / Operador.

## Setup

```shell
cd frontend
cp .env.example .env.local   # opcional: direcciones tras forge deploy
npm install
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm test` | Vitest + Testing Library |
| `npm run build` | Build producción |

## Perfiles

| Perfil | Acciones UI |
|--------|-------------|
| Observador | Solo lectura |
| Holder | Delegar + votar |
| Proponente | + crear propuestas |
| Operador | + queue / execute |

El modo actual es **demo local** (estado en memoria). Con direcciones en `.env.local` se podrá cablear ethers en una iteración siguiente.
