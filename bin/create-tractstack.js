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
  } catch { }

  return 'npm';
}

async function main() {
  // ASCII art
  console.log(kleur.blue().bold(`
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
`));

  console.log(kleur.white().bold('  build dynamic websites with HTMX and Go'));
  console.log(kleur.reset('  by At Risk Media\n'));

  // Check if we're in an Astro project
  if (!existsSync('./astro.config.mjs') && !existsSync('./astro.config.ts')) {
    console.log(kleur.red('❌ This doesn\'t appear to be an Astro project.'));
    console.log('Please run this command in the root of your Astro project.\n');
    console.log('To create a new Astro project with TractStack:');
    console.log(kleur.cyan('pnpm create astro@latest my-tractstack-site'));
    console.log(kleur.cyan('cd my-tractstack-site'));
    console.log(kleur.cyan('npx astro add astro-tractstack'));
    process.exit(1);
  }

  // Prompt for configuration
  const responses = await prompts([
    {
      type: 'text',
      name: 'goBackend',
      message: 'TractStack Go backend URL:',
      initial: 'http://127.0.0.1:8080',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'text',
      name: 'tenantId',
      message: 'Tenant ID:',
      initial: 'default',
      validate: (value) => value.length > 0 || 'Tenant ID is required'
    }
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

  // Install React dependencies
  const packageManager = detectPackageManager();
  const addCommand = packageManager === 'npm' ? 'npm install' : `${packageManager} add`;

  console.log(kleur.cyan('\nInstalling React dependencies...'));
  try {
    execSync(`${addCommand} react react-dom @astrojs/react`, { stdio: 'inherit' });
    console.log(kleur.green('✅ React dependencies installed'));
  } catch (error) {
    console.log(kleur.red('❌ Failed to install React dependencies'));
    console.log('Please run manually:', kleur.cyan(`${addCommand} react react-dom @astrojs/react`));
    process.exit(1);
  }

  // Update astro.config file
  await updateAstroConfig();

  // Success message
  console.log(kleur.green('\n🎉 TractStack setup complete!'));

  const runCommand = packageManager === 'npm' ? 'npm run' : `${packageManager} run`;

  console.log('\nNext steps:');
  console.log(kleur.cyan('1. Start your Go backend:'));
  console.log('   tractstack-go');
  console.log(kleur.cyan('2. Start your Astro development server:'));
  console.log(`   ${runCommand} dev`);
  console.log('\n📚 Documentation: https://tractstack.org/docs');
}

async function updateAstroConfig() {
  const configFiles = ['astro.config.mjs', 'astro.config.ts'];
  const configFile = configFiles.find(file => existsSync(file));

  if (!configFile) {
    console.log(kleur.yellow('⚠️ Could not find astro.config file to update'));
    console.log(kleur.cyan('Please manually add the tractstack integration to your astro.config file'));
    return;
  }

  try {
    let content = readFileSync(configFile, 'utf-8');

    // Add imports if not present
    if (!content.includes('astro-tractstack')) {
      const tractStackImport = "import tractstack from 'astro-tractstack';\n";
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

    if (!content.includes('@astrojs/react')) {
      content = content.replace(
        "import tractstack from 'astro-tractstack';",
        "import tractstack from 'astro-tractstack';\nimport react from '@astrojs/react';"
      );
    }

    // Add integrations
    if (!content.includes('tractstack()')) {
      content = content.replace(
        /export default defineConfig\(\{([^}]*)\}\);/,
        (match, configContent) => {
          if (configContent.includes('integrations:')) {
            return match.replace(
              /integrations:\s*\[([\s\S]*?)\]/,
              (integrationsMatch, integrationsList) => {
                const hasIntegrations = integrationsList.trim().length > 0;
                const separator = hasIntegrations ? ',\n    ' : '\n    ';
                return `integrations: [${integrationsList}${separator}react(),\n    tractstack()\n  ]`;
              }
            );
          } else {
            const hasOtherConfig = configContent.trim().length > 0;
            const separator = hasOtherConfig ? ',\n  ' : '\n  ';
            return `export default defineConfig({${configContent}${separator}integrations: [\n    react(),\n    tractstack()\n  ]\n});`;
          }
        }
      );
    }

    writeFileSync(configFile, content);
    console.log(kleur.green(`✅ Updated ${configFile}`));
  } catch (error) {
    console.log(kleur.yellow(`⚠️ Could not automatically update ${configFile}`));
    console.log(kleur.cyan('Please manually add the tractstack integration'));
  }
}

main().catch(console.error);
