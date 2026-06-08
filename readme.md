# Getting Started

Welcome to your new CAP project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`readme.md` | this getting started guide

## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start with your domain model, in a CDS file in `db/`

## Learn More

Learn more at <https://cap.cloud.sap>.

## Integracao com Neon Postgres

1. Crie um arquivo `.env` na raiz do projeto com a URL de conexao do Neon:

```env
CDS_REQUIRES_DB_CREDENTIALS_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

2. Instale as dependencias (se ainda nao instalou):

```bash
npm install
```

3. Faça o deploy do schema CDS no Postgres:

```bash
npm run deploy:pg
```

4. Suba o servico:

```bash
npm start
```

Notas:
- O projeto esta configurado para usar `postgres` em `cds.requires.db.kind`.
- O parametro `sslmode=require` e importante para o Neon.
- Evite versionar credenciais. O `.env` fica local no seu ambiente.
