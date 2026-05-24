# On-Prem Docker Runbook

1. Copy `.env.example` to `.env` and set production secrets.
2. Start stack:

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

3. Run migrations:

```bash
docker compose -f infra/docker/docker-compose.yml exec api npx prisma migrate deploy
```

4. Open API docs:
- http://localhost:3000/docs