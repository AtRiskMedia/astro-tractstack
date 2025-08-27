# Tract Stack

create your own adaptive website or newsletter

the "free web press"
no-code community engine

by [At Risk Media](https://atriskmedia.com)

## epistemic hypermedia server

...a new species of web 2.0: an outcome of hybrid speciation.

The `tractstack-go` package provides a backend server for the `astro-tractstack` integration

Tract Stack makes it easy for non-technical people to build and grow adaptive websites that are fast, beautiful, SEO-ready, and accessible.

Tract Stack is built on [Astro](https://astro.build/) with [HTMX](https://htmx.org/) and a [Golang](https://go.dev/) backend -- we recommend [Turso](https://app.turso.tech/) as database

## Documentation

Please visit [our docs](https://tractstack.org)

For production deployment you'll need to prepare your server.

_Quick Install_ in two steps:

First install and run the go backend. It runs on port 8080 by default.

```
mkdir -p ~/src
cd ~/src
git clone https://github.com/AtRiskMedia/tractstack-go.git
cd tractstack-go
go build cmd/tractstack-go/main.go
./tractstack-go
```
Next create an Astro starter then install Tract Stack as an integration:

```
cd ~/src
pnpm create astro@latest my-tractstack --template minimal --typescript strict --install
cd my-tractstack
pnpm add astro-tractstack@latest
npx create-tractstack
pnpm dev
```

## Queries?

Reach out at hello -at- tractstack -dot- com

## License

Functional Source License, Version 1.1, MIT Future License
