# SympAuthy Documentation

This repository contains the documentation for SympAuthy, an open-source authentication & authorization server.

## Prerequisites

Before running the documentation locally, ensure you have the following installed:

- **Node.js**: Version 20 (as specified in `.nvmrc`)
- **npm**: Comes with Node.js

### Installing Node.js

If you're using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager), you can install and use the correct Node.js version automatically:

```bash
nvm install
nvm use
```

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:sympauthy/sympauthy.github.io.git
cd sympauthy.github.io
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the documentation locally

To start the development server with hot-reload:

```bash
npm run docs:dev
```

The documentation will be available at `http://localhost:5173` (or another port if 5173 is already in use).

### 4. Build for production

To build the documentation for production:

```bash
npm run docs:build
```

The built files will be generated in the `docs/.vitepress/dist` directory.

### 5. Preview the production build

To preview the production build locally:

```bash
npm run docs:preview
```

## Documentation Structure

The documentation is organized as follows:

```
docs/
├── .vitepress/          # VitePress configuration
├── documentation/       # Main documentation
│   ├── functionnal/    # Functional documentation
│   └── technical/      # Technical documentation
├── getting-started/    # Getting started guide
└── index.md           # Homepage
```

## Technology Stack

This documentation site is built with:

- **[VitePress](https://vitepress.dev/)**: A static site generator powered by Vite and Vue

## Contributing

When contributing to the documentation:

1. Make sure all internal links use the correct format: `/documentation/technical/1%20-%20Configuration`
2. Test your changes locally before submitting
3. Ensure the build completes successfully with `npm run docs:build`

## License

ISC
