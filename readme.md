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

## PostgreSQL Integration

This project is configured to use PostgreSQL as the database.

### 1. Configure credentials

- Copy `.env.example` to `.env` and fill your PostgreSQL values.

### 2. Start the application

- `npm run watch-flow4`

### 3. Deploy schema to PostgreSQL

- `npx cds deploy`
