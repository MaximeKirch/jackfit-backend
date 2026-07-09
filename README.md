# jackfit-backend

API Express/TypeScript pour JackFit — gère la conversation avec Uma via Claude et la persistance des messages dans Supabase.

## Stack

- **Runtime** : Node.js 20 + TypeScript strict
- **Framework** : Express 4
- **IA** : Anthropic API (`claude-sonnet-4-6`) avec prompt caching
- **Base de données** : Supabase (PostgreSQL)
- **Tests** : Jest + Supertest
- **Infra** : Docker + GitHub Actions CI/CD

## Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/chat` | Envoie un message à Uma, retourne la réponse IA |
| `GET` | `/health` | Health check |

### `POST /chat`

```json
{
  "userId": "uuid",
  "message": "Comment tu vas Uma ?",
  "healthData": {
    "workouts": [{ "type": "running", "duration": 45, "calories": 400, "date": "2026-07-07T07:00:00Z" }],
    "sleep": [{ "duration": 7.5, "quality": "good", "date": "2026-07-07" }],
    "steps": 8500,
    "weeklyScore": 72
  }
}
```

Réponse :
```json
{ "message": "J'ai tellement d'énergie aujourd'hui ! 🐾" }
```

## Variables d'environnement

Copie `.env.example` → `.env` et remplis les valeurs.

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (`sk-ant-...`) |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SECRET_KEY` | Secret key Supabase (`sb_secret_...`) — bypass RLS |
| `PORT` | Port du serveur (défaut : 3000) |
| `JACKFIT_API_KEY` | Optionnel — active une vérification `X-Api-Key` sur toutes les routes |

## Développement

```bash
npm install
npm run dev       # tsx watch — hot reload
```

## Tests

```bash
npm test
npm run test:watch
```

## Build & production

```bash
npm run build     # compile TypeScript → dist/
npm start         # node dist/index.js
```

## Docker

```bash
# Dev avec hot reload
docker-compose up

# Build image de prod
docker build -t jackfit-api .
```

## Architecture

```
src/
├── app.ts                    # Express app — middlewares, routes, error handler
├── index.ts                  # Entrypoint — charge dotenv, démarre le serveur
├── controllers/
│   └── chat.controller.ts    # Validation Zod + appel service
├── middleware/
│   ├── auth.middleware.ts     # Vérification optionnelle X-Api-Key
│   └── validate.middleware.ts # Validation body via schema Zod
├── routes/
│   ├── chat.route.ts
│   └── health.route.ts
├── services/
│   ├── anthropic.service.ts   # Appel Claude — fetche historique + profil, sauvegarde
│   ├── prompt.service.ts      # Prompt système Uma avec données health + profil
│   └── supabase.service.ts    # Client Supabase — messages, profil utilisateur
└── types/
    └── api.types.ts           # HealthSummary, UserProfile, ChatRequest…
```

## Fonctionnement du chat

1. Réception de `{ userId, message, healthData }`
2. Fetch en parallèle : historique des messages + profil utilisateur (depuis Supabase)
3. Construction du prompt Uma avec les données health et le profil
4. Appel `claude-sonnet-4-6` avec prompt caching sur le system prompt
5. Sauvegarde des deux messages (user + assistant) dans Supabase
6. Retour de la réponse
