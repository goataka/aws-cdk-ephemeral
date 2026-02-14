#!/usr/bin/env node

import { Command } from 'commander';
import { deploy, destroy } from './cdk';
import { getCurrentBranch, generateEnvName } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('cdkeph')
  .description('Tool for managing ephemeral AWS CDK environments')
  .version(packageJson.version);

program
  .command('deploy')
  .description('Deploy CDK application to ephemeral environment')
  .option('-e, --env <name>', 'Environment name (default: eph-<current-branch>)')
  .option('-p, --profile <profile>', 'AWS profile to use')
  .option('-c, --context <key=value...>', 'Additional CDK context values')
  .action(async (options) => {
    try {
      // Parse context options
      const context: Record<string, string> = {};
      if (options.context) {
        for (const item of options.context) {
          const [key, value] = item.split('=');
          if (key && value) {
            context[key] = value;
          }
        }
      }
      
      await deploy({
        env: options.env,
        profile: options.profile,
        context
      });
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('destroy')
  .description('Destroy ephemeral environment')
  .option('-e, --env <name>', 'Environment name (default: eph-<current-branch>)')
  .option('-p, --profile <profile>', 'AWS profile to use')
  .action(async (options) => {
    try {
      await destroy({
        env: options.env,
        profile: options.profile
      });
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about current ephemeral environment')
  .action(async () => {
    try {
      const branch = await getCurrentBranch();
      const envName = generateEnvName(branch);
      
      console.log('Current ephemeral environment information:');
      console.log(`  Branch: ${branch}`);
      console.log(`  Environment: ${envName}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
