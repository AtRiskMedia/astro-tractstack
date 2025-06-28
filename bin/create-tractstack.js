#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import prompts from 'prompts';
import kleur from 'kleur';

// Detect package manager
function detectPackageManager() {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  if (existsSync('package-lock.json')) return 'npm';

  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    if (pkg.packageManager?.startsWith('pnpm')) return 'pnpm';
    if (pkg.packageManager?.startsWith('yarn')) return 'yarn';
  } catch {}

  return 'pnpm';
}

async function main() {
  // ASCII art
  console.log(
    kleur.blue().bold(`
    ███        ▄████████    ▄████████  ▄████████     ███    
▀█████████▄   ███    ███   ███    ███ ███    ███ ▀█████████▄
   ▀███▀▀██   ███    ███   ███    ███ ███    █▀     ▀███▀▀██
    ███   ▀  ▄███▄▄▄▄██▀   ███    ███ ███            ███   ▀
    ███     ▀▀███▀▀▀▀▀   ▀███████████ ███            ███    
    ███     ▀███████████   ███    ███ ███    █▄      ███    
    ███       ███    ███   ███    ███ ███    ███     ███    
   ▄████▀     ███    ███   ███    █▀  ████████▀     ▄████▀  
              ███    ███                                    

   ▄████████     ███        ▄████████  ▄████████    ▄█   ▄█▄
  ███    ███ ▀█████████▄   ███    ███ ███    ███   ███ ▄███▀
  ███    █▀     ▀███▀▀██   ███    ███ ███    █▀    ███▐██▀  
  ███            ███   ▀   ███    ███ ███         ▄█████▀   
▀███████████     ███     ▀███████████ ███        ▀▀█████▄   
         ███     ███       ███    ███ ███    █▄    ███▐██▄  
   ▄█    ███     ███       ███    ███ ███    ███   ███ ▀███▄
 ▄████████▀     ▄████▀     ███    █▀  ████████▀    ███   ▀█▀
                                                   ▀        
`)
  );

  console.log(kleur.white().bold('  build dynamic websites with HTMX and Go'));
  console.log(kleur.reset('  by At Risk Media\n'));

  // Check if we're in an Astro project
  if (!existsSync('./astro.config.mjs') && !existsSync('./astro.config.ts')) {
    console.log(kleur.red("❌ This doesn't appear to be an Astro project."));
    console.log('Please run this command in the root of your Astro project.\n');
    console.log('To create a new Astro project with TractStack:');
    console.log(kleur.cyan('pnpm create astro@latest my-tractstack-site'));
    console.log(kleur.cyan('cd my-tractstack-site'));
    console.log(kleur.cyan('npx create-tractstack'));
    process.exit(1);
  }

  // Prompt for configuration
  const responses = await prompts([
    {
      type: 'text',
      name: 'goBackend',
      message: 'TractStack Go backend URL:',
      initial: 'http://localhost:8080',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
    {
      type: 'text',
      name: 'tenantId',
      message: 'Tenant ID:',
      initial: 'default',
      validate: (value) => value.length > 0 || 'Tenant ID is required',
    },
  ]);

  if (!responses.goBackend || !responses.tenantId) {
    console.log(kleur.red('\n❌ Setup cancelled.'));
    process.exit(1);
  }

  // Create .env file
  const envContent = `# TractStack Configuration
PUBLIC_GO_BACKEND="${responses.goBackend}"
PUBLIC_TENANTID="${responses.tenantId}"
`;

  try {
    writeFileSync('.env', envContent);
    console.log(kleur.green('✅ Created .env file'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to create .env file:', error.message));
    process.exit(1);
  }

  // Install dependencies
  const packageManager = detectPackageManager();
  const addCommand =
    packageManager === 'pnpm' ? 'pnpm add' : `${packageManager} add`;

  console.log(kleur.cyan('\nInstalling dependencies...'));
  try {
    // Install React and Node adapter
    execSync(
      `${addCommand} react react-dom @astrojs/react@4.3.0 @astrojs/node`,
      { stdio: 'inherit' }
    );
    console.log(kleur.green('✅ React and Node adapter installed'));

    // Install UI components
    execSync(`${addCommand} @ark-ui/react`, { stdio: 'inherit' });
    console.log(kleur.green('✅ UI components installed'));

    // Install additional dependencies
    execSync(`${addCommand} path-to-regexp`, { stdio: 'inherit' });
    console.log(kleur.green('✅ Additional dependencies installed'));

    // Install dev dependencies
    execSync(
      `${addCommand} -D prettier prettier-plugin-astro prettier-plugin-tailwindcss typescript @types/react @types/react-dom`,
      { stdio: 'inherit' }
    );
    console.log(kleur.green('✅ Dev dependencies installed'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to install dependencies'));
    console.log(
      'Please run manually:',
      kolor.cyan(
        `${addCommand} react react-dom @astrojs/react@4.3.0 @astrojs/node @ark-ui/react path-to-regexp`
      )
    );
    console.log(
      'And:',
      kolor.cyan(
        `${addCommand} -D prettier prettier-plugin-astro prettier-plugin-tailwindcss typescript @types/react @types/react-dom`
      )
    );
    process.exit(1);
  }

  // Create .gitignore
  const gitignoreContent = `# Node.js dependencies
node_modules/
.pnpm-store/

# Astro build output
dist/
.astro/

# Environment variables
.env
.env.*

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
!.vscode/launch.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.swp

# OS generated files
.DS_Store
Thumbs.db

# Project-specific ignores
public/styles/
public/fonts/
`;
  if (!existsSync('.gitignore')) {
    writeFileSync('.gitignore', gitignoreContent);
    console.log(kleur.green('✅ Created .gitignore'));
  } else {
    console.log(
      kleur.yellow('⚠️ .gitignore already exists, skipping creation')
    );
  }

  // Create .prettierignore
  const prettierIgnore = `node_modules/
dist/
.astro/
public/styles/
public/fonts/
`;
  if (!existsSync('.prettierignore')) {
    writeFileSync('.prettierignore', prettierIgnore);
    console.log(kleur.green('✅ Created .prettierignore'));
  } else {
    console.log(
      kleur.yellow('⚠️ .prettierignore already exists, skipping creation')
    );
  }

  // Create .prettierrc
  const prettierConfig = `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [
    { "files": "*.astro", "options": { "parser": "astro" } },
    { "files": "*.css", "options": { "parser": "css" } },
    { "files": "*.cjs", "options": { "parser": "babel" } }
  ]
}`;
  if (!existsSync('.prettierrc')) {
    writeFileSync('.prettierrc', prettierConfig);
    console.log(kleur.green('✅ Created .prettierrc'));
  } else {
    console.log(
      kleur.yellow('⚠️ .prettierrc already exists, skipping creation')
    );
  }

  // Create src/types/astro.d.ts
  const astroTypes = `export {};

declare global {
  interface ImportMeta {
    env: {
      PUBLIC_GO_BACKEND?: string;
      PUBLIC_TENANTID?: string;
      DEV?: boolean;
    };
  }

  interface Locals {
    session?: Record<string, any>;
  }
}
`;
  if (!existsSync('src/types/astro.d.ts')) {
    writeFileSync('src/types/astro.d.ts', astroTypes);
    console.log(kleur.green('✅ Created src/types/astro.d.ts'));
  } else {
    console.log(
      kleur.yellow('⚠️ src/types/astro.d.ts already exists, skipping creation')
    );
  }

  // Create tsconfig.json
  const tsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["astro", "@astrojs/react", "node", "@types/react", "@types/react-dom"]
  },
  "include": ["src/**/*", "public/**/*", "tailwind.config.cjs", "src/types/astro.d.ts"],
  "exclude": ["node_modules", "dist", ".astro"]
}`;
  if (!existsSync('tsconfig.json')) {
    writeFileSync('tsconfig.json', tsConfig);
    console.log(kleur.green('✅ Created tsconfig.json'));
  } else {
    console.log(
      kleur.yellow('⚠️ tsconfig.json already exists, skipping creation')
    );
  }

  // Update package.json
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    pkg.scripts = {
      ...pkg.scripts,
      dev: 'astro dev',
      build: 'astro build',
      format: 'prettier --write .',
      'format:check': 'prettier --check .',
      tsc: 'tsc --noEmit --pretty',
    };
    pkg.packageManager = 'pnpm@9.15.4';
    pkg.engines = { node: '>=18.14.1', pnpm: '>=9.15.4' };
    writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log(kleur.green('✅ Updated package.json'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to update package.json:', error.message));
  }

  // Update astro.config file
  async function updateAstroConfig() {
    const configFiles = ['astro.config.mjs', 'astro.config.ts'];
    const configFile = configFiles.find((file) => existsSync(file));

    if (!configFile) {
      console.log(
        kleur.yellow('⚠️ Could not find astro.config file to update')
      );
      console.log(
        kleur.cyan(
          'Please manually add the tractstack integration to your astro.config file'
        )
      );
      return;
    }

    try {
      let content = readFileSync(configFile, 'utf-8');

      // Add tractstack import if not present
      if (!content.includes('astro-tractstack')) {
        const tractStackImport = "import tractstack from 'astro-tractstack';\n";

        // Find the last import statement
        const lines = content.split('\n');
        let insertIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            insertIndex = i + 1;
          } else if (lines[i].trim() === '' && insertIndex > 0) {
            break;
          }
        }

        lines.splice(insertIndex, 0, tractStackImport);
        content = lines.join('\n');
      }

      // Add react import if not present
      if (!content.includes('@astrojs/react')) {
        content = content.replace(
          "import tractstack from 'astro-tractstack';",
          "import tractstack from 'astro-tractstack';\nimport react from '@astrojs/react';"
        );
      }

      // Add node import if not present
      if (!content.includes('@astrojs/node')) {
        content = content.replace(
          "import react from '@astrojs/react';",
          "import react from '@astrojs/react';\nimport node from '@astrojs/node';"
        );
      }

      // Update the export default defineConfig section
      content = content.replace(
        /export default defineConfig\(\{[\s\S]*?\}\);/,
        `export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    tractstack(),
    react()
  ]
});`
      );

      writeFileSync(configFile, content);
      console.log(kleur.green(`✅ Updated ${configFile}`));
    } catch (error) {
      console.log(
        kleur.yellow(`⚠️ Could not automatically update ${configFile}`)
      );
      console.log(
        kleur.cyan(
          'Please manually add tractstack() and react() to your integrations array'
        )
      );
      console.log(kleur.cyan('Example: integrations: [tractstack(), react()]'));
      console.log(kleur.cyan('Make sure tractstack() is FIRST in the array!'));
    }
  }

  await updateAstroConfig();

  // Format project files
  try {
    execSync(`${packageManager} format`, { stdio: 'inherit' });
    console.log(kleur.green('✅ Formatted project files'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to format files:', error.message));
  }

  // Success message
  console.log(kleur.green('\n🎉 TractStack setup complete!'));

  const runCommand =
    packageManager === 'pnpm' ? 'pnpm run' : `${packageManager} run`;

  console.log('\nNext steps:');
  console.log(kleur.cyan('1. Start your Go backend:'));
  console.log('   tractstack-go');
  console.log(kleur.cyan('2. Start your Astro development server:'));
  console.log(`   ${runCommand} dev`);
  console.log('\n📚 Documentation: https://tractstack.org/docs');
}

main().catch(console.error);
