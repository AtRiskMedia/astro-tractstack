#!/usr/bin/env node

import {
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  existsSync,
} from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
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
 ▄██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄██▄▄▄▄▄▄▄██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ ▄▄▄
  ██  ██ ██ ▀▀ ██ ██ ▀▀ ██ ██ ▀▀ ██ ▀▀ ██ ██ ▀▀ ██ ██
  ██  ██▀█▄ ██▀██ ██ ▄▄ ██ ▀▀▀██ ██ ██▀██ ██ ▄▄ ██▀█▄
  ██  ██ ██ ██▄██ ██▄██ ██ ██▄██ ██ ██▄██ ██▄██ ██ ██
   ▀▀                   ▀▀       ▀▀             ▀▀ ▀▀▀
`)
  );

  console.log(kleur.white().bold('  build your own adaptive website'));
  console.log(kleur.reset('  made by At Risk Media\n'));

  // Parse command line arguments
  const args = process.argv.slice(2);
  let includeExamples = false;
  let enableMultiTenant = false;
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--examples') {
      includeExamples = true;
    } else if (args[i] === '--multi-tenant') {
      enableMultiTenant = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      showHelp = true;
    }
  }

  if (showHelp) {
    console.log(`${kleur.bold('create-tractstack')} - Initialize a new TractStack project

${kleur.bold('Usage:')}
  create-tractstack [options]

${kleur.bold('Options:')}
  --examples      Include example components and collections route
  --multi-tenant  Enable multi-tenant functionality for sandbox hosting
  --help, -h     Show this help message

${kleur.bold('Examples:')}
  create-tractstack
  create-tractstack --examples
  create-tractstack --multi-tenant
  create-tractstack --examples --multi-tenant`);
    process.exit(0);
  }

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
    {
      type: 'text',
      name: 'goBackendPath',
      message: 'TractStack Go backend path:',
      initial: `${homedir()}/t8k-go-server/`,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Backend path is required';
        }
        // Ensure it ends with trailing slash for consistency
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'includeExamples',
      message:
        'Include CodeHook examples? (custom components, collections route)',
      initial: includeExamples,
    },
    {
      type: 'confirm',
      name: 'enableMultiTenant',
      message: 'Enable multi-tenant functionality?',
      initial: enableMultiTenant,
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
PRIVATE_GO_BACKEND_PATH="${responses.goBackendPath.endsWith('/') ? responses.goBackendPath : responses.goBackendPath + '/'}"
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
      `${addCommand} react@^18.3.1 react-dom@^18.3.1 @astrojs/react@^4.0.0 @astrojs/node@^9.4.3`,
      { stdio: 'inherit' }
    );
    console.log(kleur.green('✅ React and Node adapter installed'));

    // Install core dependencies
    execSync(
      `${addCommand} @nanostores/react@^1.0.0 nanostores@^1.0.1 @nanostores/persistent ulid`,
      {
        stdio: 'inherit',
      }
    );
    console.log(kleur.green('✅ State management installed'));

    // Install UI components
    execSync(
      `${addCommand} @ark-ui/react@^5.21.0 @heroicons/react@^2.1.1 @internationalized/date@^3.8.2`,
      {
        stdio: 'inherit',
      }
    );
    console.log(kleur.green('✅ UI components installed'));

    // Install visualization dependencies
    execSync(
      `${addCommand} d3@^7.9.0 d3-sankey@^0.12.3 recharts@^3.1.2 player.js@^0.1.0 tinycolor2 html-to-image`,
      {
        stdio: 'inherit',
      }
    );
    console.log(kleur.green('✅ Visualization dependencies installed'));

    // Install additional dependencies
    execSync(`${addCommand} path-to-regexp@^8.0.0`, { stdio: 'inherit' });
    console.log(kleur.green('✅ Additional dependencies installed'));

    // Install dev dependencies
    execSync(
      `${addCommand} -D @types/node@^22.18.0 @types/react@^18.3.11 @types/react-dom@^18.3.0 @types/d3@^7.4.3 @types/d3-sankey@^0.12.3 prettier@^3.3.3 prettier-plugin-astro@^0.14.1 prettier-plugin-tailwindcss@^0.6.8 typescript@^5.9.2 @types/tinycolor2 @mhsdesign/jit-browser-tailwindcss`,
      { stdio: 'inherit' }
    );
    console.log(kleur.green('✅ Dev dependencies installed'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to install dependencies'));
    console.log('Please run manually:');
    console.log(
      kleur.cyan(
        `${addCommand} react react-dom @astrojs/react @astrojs/node @ark-ui/react @heroicons/react d3 d3-sankey recharts player.js path-to-regexp @nanostores/react nanostores @nanostores/persistent ulid tinycolor2`
      )
    );
    console.log(
      kleur.cyan(
        `${addCommand} -D @types/node @types/react @types/react-dom @types/d3 @types/d3-sankey @types/tinycolor2 prettier prettier-plugin-astro prettier-plugin-tailwindcss typescript @mhsdesign/jit-browser-tailwindcss`
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
.env.local
.env.production

# OS-specific files
.DS_Store
Thumbs.db

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo

# TypeScript
*.tsbuildinfo

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# TractStack specific
public/media/
src/content/generated/
`;

  if (!existsSync('.gitignore')) {
    writeFileSync('.gitignore', gitignoreContent);
    console.log(kleur.green('✅ Created .gitignore'));
  }

  // Create directories
  const dirs = [
    'src',
    'src/components',
    'src/layouts',
    'src/pages',
    'src/types',
    'src/utils',
    'src/stores',
    'src/hooks',
    'public',
    'public/brand',
    'public/socials',
  ];

  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  console.log(kleur.green('✅ Created directory structure'));

  // Remove unwanted index.astro
  const indexAstroPath = resolve('src/pages/index.astro');
  if (existsSync(indexAstroPath)) {
    unlinkSync(indexAstroPath);
    console.log(kleur.green('✅ Removed src/pages/index.astro'));
  } else {
    console.log(kleur.yellow('⚠️ No src/pages/index.astro found to remove'));
  }

  // Update Astro config
  async function updateAstroConfig() {
    const configs = ['astro.config.mjs', 'astro.config.ts'];
    let configFile = null;

    for (const config of configs) {
      if (existsSync(config)) {
        configFile = config;
        break;
      }
    }

    if (!configFile) {
      console.log(kleur.red('❌ No Astro config file found'));
      return;
    }

    try {
      let newContent;
      if (configFile.endsWith('.ts')) {
        newContent = `import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tractstack from 'astro-tractstack';

export default defineConfig({
  integrations: [
    react(),
    tractstack({
      includeExamples: ${responses.includeExamples},
      enableMultiTenant: ${responses.enableMultiTenant},
    }),
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});`;
      } else {
        newContent = `import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tractstack from 'astro-tractstack';

export default defineConfig({
  integrations: [
    react(),
    tractstack({
      includeExamples: ${responses.includeExamples},
      enableMultiTenant: ${responses.enableMultiTenant},
    }),
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});`;
      }

      writeFileSync(configFile, newContent);
      console.log(kleur.green(`✅ Updated ${configFile}`));
    } catch (error) {
      console.log(
        kleur.red(`❌ Failed to update ${configFile}:`, error.message)
      );
    }
  }

  // Create prettier config
  const prettierConfig = `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "plugins": [
    "prettier-plugin-astro",
    "prettier-plugin-tailwindcss"
  ],
  "overrides": [
    {
      "files": "*.astro",
      "options": {
        "parser": "astro"
      }
    }
  ]
}`;

  if (!existsSync('.prettierrc')) {
    writeFileSync('.prettierrc', prettierConfig);
    console.log(kleur.green('✅ Created Prettier config'));
  }

  // Create tsconfig.json
  const tsConfig = `{
    "extends": "astro/tsconfigs/strict",
    "compilerOptions": {
      "baseUrl": ".",
      "paths": { "@/*": ["src/*"] },
      "types": ["astro/client", "@astrojs/react", "node", "@types/react", "@types/react-dom", "@types/tinycolor2"]
    },
    "include": ["src/**/*", "public/**/*", "tailwind.config.cjs"],
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
    };

    writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log(kleur.green('✅ Updated package.json scripts'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to update package.json:', error.message));
  }

  // Install TractStack (this will trigger file injection)
  //try {
  //  execSync(`${addCommand} astro-tractstack@latest`, {
  //    stdio: 'inherit',
  //  });
  //  console.log(kleur.green('✅ TractStack installed'));
  //} catch (error) {
  //  console.log(kleur.red('❌ Failed to install TractStack:', error.message));
  //  console.log('Please run manually:');
  //  console.log(kleur.cyan(`${addCommand} astro-tractstack@latest`));
  //  if (packageManager !== 'npm') {
  //    try {
  //      execSync(`${packageManager} install`, { stdio: 'inherit' });
  //    } catch {
  //      console.log(kleur.red('❌ Failed to run install'));
  //    }
  //  }
  //}
  console.log(
    kleur.red(
      '❌ Not installing TractStack NPM package yet: using local pnpm linked'
    )
  );

  await updateAstroConfig();

  // Initialize TractStack integration and format project files
  try {
    console.log(kleur.cyan('🔧 Initializing TractStack integration...'));
    execSync(`${packageManager} astro build`, { stdio: 'inherit' });
    console.log(kleur.green('✅ TractStack templates injected'));

    execSync(`${packageManager} format`, { stdio: 'inherit' });
    console.log(kleur.green('✅ Formatted project files'));
  } catch (error) {
    console.log(
      kleur.yellow(
        '⚠️ Setup completed, but run `pnpm astro build && pnpm format` to finish'
      )
    );
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

  if (responses.enableMultiTenant) {
    console.log('\n' + kleur.bold('Multi-tenant features enabled:'));
    console.log(`  • Tenant registration: ${kleur.cyan('/sandbox/register')}`);
    console.log(`  • Subdomain routing middleware added`);
    console.log(`  • Admin-only tenant management`);
    console.log(
      `\n${kleur.yellow('Note:')} Make sure your Go backend has ENABLE_MULTI_TENANT=true`
    );
  }

  if (responses.includeExamples) {
    console.log(`\n${kleur.bold('Example components included:')}`);
    console.log(
      `  • Collections route: ${kleur.cyan('/collections/[param1]')}`
    );
    console.log(`  • Custom components and CodeHooks`);
  }

  console.log('\n📚 Documentation: https://tractstack.org/docs');
}

main().catch(console.error);
