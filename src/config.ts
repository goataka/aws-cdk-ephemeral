import * as fs from 'fs';
import * as path from 'path';

export interface EphemeralConfig {
  ttlHours?: number;
  stackName?: string;
  envHash?: string;
  envPrefix?: string;
}

export interface CdkJsonConfig {
  app?: string;
  context?: Record<string, any>;
  ephemeral?: EphemeralConfig;
}

/**
 * Loads configuration from cdk.json
 */
export function loadConfig(configPath?: string): CdkJsonConfig {
  const cdkJsonPath = configPath || path.join(process.cwd(), 'cdk.json');
  
  if (!fs.existsSync(cdkJsonPath)) {
    throw new Error(`cdk.json not found at ${cdkJsonPath}. Please create one or run from your CDK project directory.`);
  }
  
  const content = fs.readFileSync(cdkJsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Gets the TTL in hours from config, defaults to 24 hours
 */
export function getTTL(config: CdkJsonConfig): number {
  return config.ephemeral?.ttlHours || 24;
}

/**
 * Gets the CloudFormation stack name for ephemeral resources
 */
export function getStackName(config: CdkJsonConfig): string {
  return config.ephemeral?.stackName || 'EphemeralStack';
}

/**
 * Gets the AWS region from environment
 */
export function getRegion(): string {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-northeast-1';
}

/**
 * Gets role ARNs from CloudFormation stack outputs
 */
export async function getRoleArns(stackName: string, region: string): Promise<{
  deploymentRoleArn?: string;
  cdkExecutionRoleArn?: string;
  schedulerRoleArn?: string;
  permissionBoundaryArn?: string;
}> {
  try {
    const { CloudFormationClient, DescribeStacksCommand } = await import('@aws-sdk/client-cloudformation');
    const client = new CloudFormationClient({ region });
    
    const response = await client.send(new DescribeStacksCommand({
      StackName: stackName
    }));
    
    const outputs = response.Stacks?.[0]?.Outputs || [];
    const result: Record<string, string> = {};
    
    for (const output of outputs) {
      if (output.OutputKey && output.OutputValue) {
        const key = output.OutputKey;
        if (key === 'GitHubActionsRoleArn') {
          result.deploymentRoleArn = output.OutputValue;
        } else if (key === 'CDKExecutionRoleArn') {
          result.cdkExecutionRoleArn = output.OutputValue;
        } else if (key === 'SchedulerRoleArn') {
          result.schedulerRoleArn = output.OutputValue;
        } else if (key === 'PermissionBoundaryArn') {
          result.permissionBoundaryArn = output.OutputValue;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.warn(`Warning: Could not fetch role ARNs from CloudFormation stack '${stackName}': ${error}`);
    return {};
  }
}
