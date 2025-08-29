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

**Prerequisites:** 
- Node.js 18
- pnpm 9+ (recommended) or npm/yarn
- Go 1.21+
- Git

### Platform Support

**Linux:** Full native support - follow the steps below exactly as written.

**Windows (WSL):** Use Windows Subsystem for Linux with Ubuntu or similar. Install prerequisites within WSL and run all commands in the WSL terminal. The `~/t8k` directory will be created in your WSL home directory.

**macOS:** Full native support - follow the steps below exactly as written. The installation works the same as Linux.

### Step 1: Install and run the Go backend

**Linux/macOS/WSL:**
```bash
mkdir -p ~/t8k/src
cd ~/t8k/src
git clone https://github.com/AtRiskMedia/tractstack-go.git
cd tractstack-go
echo "GO_BACKEND_PATH=$HOME/t8k/t8k-go-server/" > .env
echo "GIN_MODE=release" >> .env
go build -o tractstack-go ./cmd/tractstack-go
./tractstack-go
```

**Windows (Command Prompt):**
```cmd
mkdir %USERPROFILE%\t8k\src
cd %USERPROFILE%\t8k\src
git clone https://github.com/AtRiskMedia/tractstack-go.git
cd tractstack-go
echo GO_BACKEND_PATH=%USERPROFILE%\t8k\t8k-go-server\ > .env
echo GIN_MODE=release >> .env
go build -o tractstack-go.exe ./cmd/tractstack-go
tractstack-go.exe
```

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\t8k\src" -Force
Set-Location "$env:USERPROFILE\t8k\src"
git clone https://github.com/AtRiskMedia/tractstack-go.git
Set-Location tractstack-go
"GO_BACKEND_PATH=$env:USERPROFILE\t8k\t8k-go-server\" | Out-File -FilePath .env -Encoding utf8
"GIN_MODE=release" | Out-File -FilePath .env -Append -Encoding utf8
go build -o tractstack-go.exe ./cmd/tractstack-go
.\tractstack-go.exe
```

The backend runs on port 8080 by default.

### Step 2: Create your Astro frontend

**Linux/macOS/WSL:**
```bash
cd ~/t8k
pnpm create astro@latest my-tractstack --template minimal --typescript strict --install
cd my-tractstack
pnpm add astro-tractstack@latest
echo "PRIVATE_GO_BACKEND_PATH=$HOME/t8k/t8k-go-server/" > .env
npx create-tractstack
pnpm dev
```

**Windows (Command Prompt):**
```cmd
cd %USERPROFILE%\t8k
pnpm create astro@latest my-tractstack --template minimal --typescript strict --install
cd my-tractstack
pnpm add astro-tractstack@latest
echo PRIVATE_GO_BACKEND_PATH=%USERPROFILE%\t8k\t8k-go-server\ > .env
npx create-tractstack
pnpm dev
```

**Windows (PowerShell):**
```powershell
Set-Location "$env:USERPROFILE\t8k"
pnpm create astro@latest my-tractstack --template minimal --typescript strict --install
Set-Location my-tractstack
pnpm add astro-tractstack@latest
"PRIVATE_GO_BACKEND_PATH=$env:USERPROFILE\t8k\t8k-go-server\" | Out-File -FilePath .env -Encoding utf8
npx create-tractstack
pnpm dev
```

### Step 3: Activate your Story Keep

Visit https://127.0.0.1:4321 in your browser.

TractStack works out of the box with local SQLite3 - no database setup required.

**Optional:** You can choose to use [Turso](https://app.turso.tech/) cloud database:

1. Create a database at [turso.tech](https://app.turso.tech/)
2. Get your database URL and auth token  
3. Activate your database during site init


## Development Workflow

1. **Start the Go backend:**
   ```bash
   cd ~/t8k/src/tractstack-go
   ./tractstack-go
   ```

2. **Start the Astro dev server:**
   ```bash
   cd ~/t8k/src/my-tractstack
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

TractStack supports multi-tenancy!


## Project Structure

```
## Project Structure

Installs in ~/t8k and scopes to tenantId=`default` when ENABLE_MULTI_TENANT=false

For multiple Tract Stack sites on a single server see our production install recipes.

```
~/t8k/
├── src/
│   ├── tractstack-go/          # Go backend source
│   │   ├── tractstack-go       # Compiled binary
│   │   └── ...
│   └── my-tractstack/          # Astro frontend
│       ├── src/
│       │   ├── custom/         # Your custom components
│       │   ├── pages/
│       │   └── ...
└── t8k-go-server/              # Backend data storage
    ├── config/
    │   ├── t8k/
    │   │   └── tenants.json    # Source of truth
    │   └── default/            # Default tenant config
    │       └── env.json        # Critical config 
    │       └── brand.json      # Personalization
    │       └── media/          # Tenant media files
    ├── db/
    │   └── default/
    │       └── tractstack.db   # SQLite database
    └── log/
        ├── system.log
        ├── tenant.log
        ├── database.log
        └── ...
```
```

The Go backend stores data in `~/t8k/t8k-go-server/` by default (quick install).


## Queries?

Reach out at hello -at- tractstack -dot- com


## License

Functional Source License, Version 1.1, MIT Future License
