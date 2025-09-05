# TractStack v2

**Redeeming the web from boring experiences**

Free web press by [At Risk Media](https://atriskmedia.com)

## Epistemic Hypermedia Server

TractStack is a new species of web platform that makes it possible for millions of websites to adapt to each visitor instead of showing everyone the same thing. It's an **adaptive website builder** that creates fast, beautiful, SEO-ready, and accessible websites that respond intelligently to user behavior.

Built on [Astro](https://astro.build/) with [HTMX](https://htmx.org/) and a [Golang](https://go.dev/) backend, TractStack uses SQLite by default with optional [Turso](https://app.turso.tech/) cloud database support.

## Key Features

- **Adaptive Content**: Websites that dynamically respond to visitor behavior
- **Multi-tenant Architecture**: Host multiple sites from a single installation
- **Built-in CMS**: StoryKeep content management system
- **Real-time Updates**: Server-sent events and HTMX for dynamic interactions
- **Production Ready**: SSL certificates, nginx integration, systemd services
- **Zero Config Database**: Works out of the box with SQLite3

## Quick Install

### One-Line Installer

```bash
curl -fsSL https://get.tractstack.com | bash
```

This automatically installs both the Go backend and creates a new Astro project with TractStack integration.

### Installation Options

- `--quick` - Development setup in user directory (no sudo required)
- `--prod --domain=yourdomain.com` - Production single-tenant
- `--multi --domain=yourdomain.com` - Production multi-tenant hosting
- `--dedicated SITE_ID --domain=yourdomain.com` - Isolated dedicated instance

## Manual Installation

**Prerequisites:**

- Node.js 20+
- pnpm (recommended) or npm
- Go 1.22+
- Git

### Step 1: Install Go Backend

```bash
mkdir -p ~/t8k/src
cd ~/t8k/src
git clone https://github.com/AtRiskMedia/tractstack-go.git
cd tractstack-go
echo "GO_BACKEND_PATH=$HOME/t8k/t8k-go-server/" > .env
echo "GIN_MODE=release" >> .env
go build -o tractstack-go ./cmd/tractstack-go
```

### Step 2: Create Astro Frontend

```bash
cd ~/t8k
pnpm create astro@latest my-tractstack --template minimal --typescript strict --install
cd my-tractstack
pnpm add astro-tractstack@latest
echo "PRIVATE_GO_BACKEND_PATH=$HOME/t8k/t8k-go-server/" > .env
npx create-tractstack
```

### Step 3: Start Development

```bash
# Terminal 1: Go backend
cd ~/t8k/src/tractstack-go
./tractstack-go

# Terminal 2: Astro frontend
cd ~/t8k/src/my-tractstack
pnpm dev
```

Visit https://127.0.0.1:4321 to access your site and activate your Story Keep (CMS).

## Installation Types

### Development (Quick Install)

- Local setup in `~/t8k/`
- No sudo required
- Perfect for development and testing
- SQLite database included

### Production Single-Tenant

- System-wide installation at `/home/t8k/`
- SSL certificates via Let's Encrypt
- nginx reverse proxy
- systemd services for automatic startup
- PM2 process management

### Production Multi-Tenant

- Same as single-tenant plus:
- Wildcard domain support (`*.yourdomain.com`)
- Tenant management at `/sandbox/register`
- Multiple isolated websites from one installation

### Dedicated Instance

- Completely separate installation per site
- Own source code, binaries, and data
- Maximum isolation and customization
- Perfect for agencies managing multiple clients

## Project Structure

```
~/t8k/                              # Development install
├── src/
│   ├── tractstack-go/             # Go backend source
│   │   └── tractstack-go          # Compiled binary
│   └── my-tractstack/             # Astro frontend
│       ├── src/
│       │   ├── components/        # Custom components
│       │   ├── pages/            # Astro pages
│       │   └── custom/           # Your customizations
│       └── astro.config.mjs
└── t8k-go-server/                 # Backend data storage
    ├── config/
    │   ├── t8k/
    │   │   └── tenants.json       # Tenant registry
    │   └── default/               # Default tenant config
    │       ├── env.json           # Core configuration
    │       ├── brand.json         # Site branding
    │       ├── knownResources.json # Resource tracking
    │       ├── tailwindWhitelist.json # CSS optimization
    │       └── media/             # Media files
    │           ├── images/
    │           └── css/
    ├── db/
    │   └── default/
    │       └── tractstack.db      # SQLite database
    └── log/
        ├── system.log
        ├── tenant.log
        └── database.log
```

### Production Structure

Production installations live at `/home/t8k/` with the same structure plus:

```
/home/t8k/
├── bin/
│   └── tractstack-go             # Production binary
├── etc/
│   ├── letsencrypt/             # SSL certificates
│   ├── pm2/                     # PM2 configs
│   └── t8k-ports.conf           # Port allocations
├── scripts/
│   └── t8k-concierge.sh         # Build automation
└── state/                       # Build queue
```

## Multi-Tenant Features

TractStack v2 includes powerful multi-tenant capabilities:

- **Tenant Registration**: Self-service tenant creation at `/sandbox/register`
- **Domain Routing**: Automatic subdomain routing (`tenant.yourdomain.com`)
- **Isolated Data**: Each tenant has separate databases and media
- **Capacity Management**: Configurable tenant limits
- **Email Activation**: Automated tenant activation emails

## SSL Certificate Management

### Cloudflare DNS (Automated)

Create `/root/.secrets/certbot/cloudflare.ini`:

```ini
dns_cloudflare_api_token = YOUR_API_TOKEN_HERE
```

Certificates are obtained automatically during installation.

### Manual DNS Verification

Without Cloudflare, the installer guides you through manual DNS TXT record verification.

## Service Management

### Main Installation

```bash
# Status
sudo systemctl status tractstack-go
sudo -u t8k pm2 status astro-main

# Restart
sudo systemctl restart tractstack-go
sudo -u t8k pm2 restart astro-main

# Logs
sudo journalctl -u tractstack-go -f
sudo -u t8k pm2 logs astro-main
```

### Dedicated Instances

```bash
# Replace SITE_ID with your site identifier
sudo systemctl status tractstack-go@SITE_ID
sudo -u t8k pm2 status astro-SITE_ID
```

## Build System

The build concierge processes automated builds via CSV files in `/home/t8k/state/`:

```csv
type=main,tenant=default,command=build
type=dedicated,site=SITE_ID,command=build
```

The system automatically:

1. Pulls latest code from Git
2. Builds Go backend and Astro frontend
3. Extracts Tailwind CSS optimizations
4. Restarts services
5. Cleans up processed files

## Database Options

### SQLite (Default)

- Zero configuration required
- Perfect for most websites
- Automatic backups and maintenance
- Scales to hundreds of thousands of visitors

### Turso Cloud Database

- Distributed SQLite with global replication
- Configure during site initialization
- Seamless scaling for high-traffic sites
- Built-in analytics and monitoring

## Development Workflow

1. **Edit Content**: Use StoryKeep CMS at `/storykeep`
2. **Customize Design**: Modify components in `src/custom/`
3. **Add Features**: Create CodeHooks for dynamic functionality
4. **Test Changes**: Hot reloading with `pnpm dev`
5. **Deploy**: Automated builds handle production updates

## API Integration

TractStack provides RESTful APIs for:

- Content management
- User analytics
- Belief tracking (visitor preferences)
- Multi-tenant operations
- Media handling

## Uninstalling

**For Production installations**, the uninstall script is located at `/home/t8k/scripts/`:

```bash
sudo /home/t8k/scripts/t8k-uninstall.sh
```

**For Quick install (development)**, the script is in:

```bash
sudo ~/t8k/src/tractstack-go/pkg/scripts/t8k-uninstall.sh
```

## Support & Documentation

- **Documentation**: https://tractstack.org
- **GitHub Issues**: https://github.com/AtRiskMedia/tractstack-go/issues
- **Email Support**: hello@tractstack.com
- **Community**: Join discussions about adaptive web experiences

## License

**Functional Source License (FSL)** - Commercial use encouraged!

The only restriction is no re-selling TractStack as-a-service. Perfect for:

- Agency client projects
- Corporate websites
- Personal projects
- Open source contributions

---

_TractStack v2 - Making the web adaptive, one site at a time_  
_Made with ❤️ by [At Risk Media](https://atriskmedia.com)_
