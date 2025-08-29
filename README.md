# Tract Stack

websites that adapt to the visitor

by [At Risk Media](https://atriskmedia.com)

## epistemic hypermedia server

...a new species of web 2.0: an outcome of hybrid speciation.

The `tractstack-go` package provides a backend server for the `astro-tractstack` integration

Tract Stack makes it easy for non-technical people to build and grow adaptive websites that are fast, beautiful, SEO-ready, and accessible.

Tract Stack is built on [Astro](https://astro.build/) with [HTMX](https://htmx.org/) and a [Golang](https://go.dev/) backend -- uses SQLite by default with optional [Turso](https://app.turso.tech/) cloud database

## Documentation

Please visit [our docs](https://tractstack.org)

For production deployment you'll need to prepare your server.

## Quick Install

**One-line installer (recommended for Linux):**

```bash
curl -fsSL https://install.tractstack.org | sh
```

This will automatically install both the Go backend and create a new Astro project with TractStack.

## Manual Installation

**Prerequisites:** Linux, Node.js 20+, pnpm 9+, Go 1.21+

### Step 1: Install and run the Go backend

```bash
mkdir -p ~/t8k
cd ~/t8k
git clone https://github.com/AtRiskMedia/tractstack-go.git
cd tractstack-go
go build cmd/tractstack-go/main.go
./tractstack-go
```

The backend runs on port 8080 by default.

### Step 2: Create your Astro frontend

```bash
cd ~/t8k
pnpm create astro@latest my-tractstack --template minimal --typescript strict --install
cd my-tractstack
pnpm add astro-tractstack@latest
npx create-tractstack
pnpm dev
```

### Step 3: Configure your environment

The `create-tractstack` command will prompt you for:
- **Go backend URL** (default: http://localhost:8080)
- **Go backend path** (for local development)
- **Multi-tenant features** (optional)
- **Example components** (optional)

### Step 4: Database setup

TractStack works out of the box with local SQLite3 - no database setup required.

**Optional:** You can choose to use [Turso](https://app.turso.tech/) cloud database:

1. Create a database at [turso.tech](https://app.turso.tech/)
2. Get your database URL and auth token  
3. Configure via `http://localhost:4321/storykeep/advanced`

## Development Workflow

1. **Start the Go backend:**
   ```bash
   cd ~/t8k/tractstack-go
   ./tractstack-go
   ```

2. **Start the Astro dev server:**
   ```bash
   cd ~/t8k/my-tractstack
   pnpm dev
   ```

3. **Access your site:**
   - Frontend: http://localhost:4321
   - StoryKeep (CMS): http://localhost:4321/storykeep

## Production Deployment

For production, you'll need:

1. **Deploy the Go backend** with proper environment variables
2. **Build and deploy the Astro frontend** with `pnpm build`
3. **Configure your database** connection
4. **Set up SSL/TLS** for your domain

See our [deployment guide](https://tractstack.org/docs/deployment) for detailed instructions.

## Multi-Tenant Features

TractStack supports multi-tenancy for SaaS applications:

```bash
# Enable during setup
npx create-tractstack
# Choose "Yes" for multi-tenant features
```

This adds:
- Tenant registration at `/sandbox/register`
- Subdomain routing middleware
- Admin tenant management
- Isolated tenant data

## Project Structure

```
my-tractstack/
├── src/
│   ├── components/     # React components
│   ├── layouts/        # Astro layouts  
│   ├── pages/          # Routes and pages
│   ├── custom/         # Your custom components
│   └── storykeep/      # CMS interface
├── public/             # Static assets
└── .env               # Environment config
```

The Go backend stores data in `~/t8k-go-server/` by default.

## Queries?

Reach out at hello -at- tractstack -dot- com

## License

Functional Source License, Version 1.1, MIT Future License
