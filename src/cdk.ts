import { execa } from 'execa';
import { loadConfig, getTTL, getRegion } from './config';
import { getCurrentBranch, generateEnvName } from './utils';
import { createDestructionSchedule, deleteDestructionSchedule } from './scheduler';

export interface DeployOptions {
  env?: string;
  profile?: string;
  context?: Record<string, string>;
  additionalArgs?: string[];
}

/**
 * Deploys a CDK application to an ephemeral environment
 */
export async function deploy(options: DeployOptions = {}): Promise<void> {
  const config = loadConfig();
  const region = getRegion(config);
  const ttl = getTTL(config);
  
  // Get environment name
  let envName: string;
  if (options.env) {
    envName = options.env;
  } else {
    const branch = await getCurrentBranch();
    envName = generateEnvName(branch);
  }
  
  console.log(`Deploying to ephemeral environment: ${envName}`);
  console.log(`Region: ${region}`);
  console.log(`TTL: ${ttl} hours`);
  
  // Build CDK command arguments
  const cdkArgs = ['deploy', '--all', '--require-approval', 'never'];
  
  // Add context for environment
  cdkArgs.push('-c', `env=${envName}`);
  
  // Add profile if specified
  if (options.profile) {
    cdkArgs.push('--profile', options.profile);
  }
  
  // Add additional context
  if (options.context) {
    for (const [key, value] of Object.entries(options.context)) {
      cdkArgs.push('-c', `${key}=${value}`);
    }
  }
  
  // Add role ARNs if configured
  if (config.ephemeral?.deploymentRoleArn) {
    cdkArgs.push('--role-arn', config.ephemeral.deploymentRoleArn);
  }
  
  if (config.ephemeral?.cdkExecutionRoleArn) {
    cdkArgs.push('--execute', '--cloudformation-execution-policies', config.ephemeral.cdkExecutionRoleArn);
  }
  
  // Add any additional arguments
  if (options.additionalArgs) {
    cdkArgs.push(...options.additionalArgs);
  }
  
  try {
    // Execute CDK deploy
    console.log(`Running: cdk ${cdkArgs.join(' ')}`);
    await execa('cdk', cdkArgs, {
      stdio: 'inherit',
      env: {
        ...process.env,
        AWS_REGION: region
      }
    });
    
    console.log('\n✓ Deployment successful');
    
    // Create cleanup schedule if scheduler role is configured
    if (config.ephemeral?.schedulerRoleArn) {
      const stackName = `${envName}-stack`; // You may need to adjust this based on your CDK app
      await createDestructionSchedule(stackName, ttl, {
        region,
        schedulerRoleArn: config.ephemeral.schedulerRoleArn
      });
    } else {
      console.log('\nWarning: No schedulerRoleArn configured. Auto-cleanup schedule not created.');
      console.log('Please configure ephemeral.schedulerRoleArn in cdk.json to enable auto-cleanup.');
    }
  } catch (error: any) {
    console.error('\n✗ Deployment failed:', error.message);
    throw error;
  }
}

/**
 * Destroys an ephemeral environment
 */
export async function destroy(options: DeployOptions = {}): Promise<void> {
  const config = loadConfig();
  const region = getRegion(config);
  
  // Get environment name
  let envName: string;
  if (options.env) {
    envName = options.env;
  } else {
    const branch = await getCurrentBranch();
    envName = generateEnvName(branch);
  }
  
  console.log(`Destroying ephemeral environment: ${envName}`);
  
  // Build CDK command arguments
  const cdkArgs = ['destroy', '--all', '--force'];
  
  // Add context for environment
  cdkArgs.push('-c', `env=${envName}`);
  
  // Add profile if specified
  if (options.profile) {
    cdkArgs.push('--profile', options.profile);
  }
  
  // Add role ARN if configured
  if (config.ephemeral?.deploymentRoleArn) {
    cdkArgs.push('--role-arn', config.ephemeral.deploymentRoleArn);
  }
  
  try {
    // Execute CDK destroy
    console.log(`Running: cdk ${cdkArgs.join(' ')}`);
    await execa('cdk', cdkArgs, {
      stdio: 'inherit',
      env: {
        ...process.env,
        AWS_REGION: region
      }
    });
    
    console.log('\n✓ Destruction successful');
    
    // Delete cleanup schedule
    const stackName = `${envName}-stack`;
    await deleteDestructionSchedule(stackName, region);
  } catch (error: any) {
    console.error('\n✗ Destruction failed:', error.message);
    throw error;
  }
}
