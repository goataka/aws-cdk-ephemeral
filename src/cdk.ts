import { execa } from 'execa';
import { loadConfig, getTTL, getRegion, getStackName, getRoleArns } from './config';
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
  const region = getRegion();
  const ttl = getTTL(config);
  const stackName = getStackName(config);
  
  // Get environment name
  let envName: string;
  let branchName: string;
  if (options.env) {
    envName = options.env;
    branchName = 'custom';
  } else {
    branchName = await getCurrentBranch();
    envName = generateEnvName(branchName);
  }
  
  console.log(`Branch: ${branchName}`);
  console.log(`Deploying to ephemeral environment: ${envName}`);
  console.log(`Region: ${region}`);
  console.log(`TTL: ${ttl} hours`);
  
  // Fetch role ARNs from CloudFormation
  console.log(`Fetching role ARNs from CloudFormation stack: ${stackName}`);
  const roleArns = await getRoleArns(stackName, region);
  
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
  
  // Add role ARNs if available
  if (roleArns.deploymentRoleArn) {
    cdkArgs.push('--role-arn', roleArns.deploymentRoleArn);
  }
  
  if (roleArns.cdkExecutionRoleArn) {
    cdkArgs.push('--cloudformation-execution-policies', roleArns.cdkExecutionRoleArn);
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
    
    // Create cleanup schedule if scheduler role is available
    if (roleArns.schedulerRoleArn) {
      const cdkStackName = `${envName}-stack`;
      await createDestructionSchedule(cdkStackName, ttl, {
        region,
        schedulerRoleArn: roleArns.schedulerRoleArn
      });
    } else {
      console.log('\nWarning: No schedulerRoleArn found in CloudFormation outputs. Auto-cleanup schedule not created.');
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
  const region = getRegion();
  const stackName = getStackName(config);
  
  // Get environment name
  let envName: string;
  let branchName: string;
  if (options.env) {
    envName = options.env;
    branchName = 'custom';
  } else {
    branchName = await getCurrentBranch();
    envName = generateEnvName(branchName);
  }
  
  console.log(`Branch: ${branchName}`);
  console.log(`Destroying ephemeral environment: ${envName}`);
  
  // Fetch role ARNs from CloudFormation
  console.log(`Fetching role ARNs from CloudFormation stack: ${stackName}`);
  const roleArns = await getRoleArns(stackName, region);
  
  // Build CDK command arguments
  const cdkArgs = ['destroy', '--all', '--force'];
  
  // Add context for environment
  cdkArgs.push('-c', `env=${envName}`);
  
  // Add profile if specified
  if (options.profile) {
    cdkArgs.push('--profile', options.profile);
  }
  
  // Add role ARN if available
  if (roleArns.deploymentRoleArn) {
    cdkArgs.push('--role-arn', roleArns.deploymentRoleArn);
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
    const cdkStackName = `${envName}-stack`;
    await deleteDestructionSchedule(cdkStackName, region);
  } catch (error: any) {
    console.error('\n✗ Destruction failed:', error.message);
    throw error;
  }
}
