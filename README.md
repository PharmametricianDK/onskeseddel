# Ønskeseddel til Cloudflare

En enkel ønskeseddel til Johannes og Anni med:

- offentlig ønskeside
- separat side hvor gæster kan markere en gave som valgt
- admin-side til nye ønsker, nye kategorier, markering af modtagne gaver og nulstilling
- R2-baseret lagring i én JSON-fil

## Teknologi

- Cloudflare Worker som server og API
- statiske HTML-, CSS- og JS-filer som frontend
- Cloudflare R2 til vedvarende lagring

## Sider

- `/` viser ønskesedlen
- `/gaver.html` bruges af gæster til at vælge en gave
- `/admin.html` er adgangsbeskyttet med HTTP Basic Auth

Admin-siden kan ikke se, hvilke gaver der allerede er valgt. Den får kun vist ønskerne og om et ønske er markeret som modtaget.

## Opsætning

1. Opret et R2 bucket med navnet `onskeseddel-storage`.
2. Opret eventuelt også preview-bucket `onskeseddel-storage-preview`, eller ret navnene i `wrangler.jsonc`.
3. Sæt en Worker-secret:

```bash
wrangler secret put ADMIN_PASSWORD
```

4. Ret eventuelt `ADMIN_USERNAME` i `wrangler.jsonc`.
5. Installér afhængigheder og deploy:

```bash
npm install
npm run deploy
```

## Automatisk deploy via GitHub Actions

Tilføj følgende GitHub Secrets i repoet:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Workflowet ligger i `.github/workflows/deploy.yml` og deployer ved push til `main`.

## Dataformat

Data gemmes i R2 som `wishlist.json` og bliver automatisk oprettet første gang appen bruges.
