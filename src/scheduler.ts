import { 
  SchedulerClient, 
  CreateScheduleCommand, 
  DeleteScheduleCommand,
  GetScheduleCommand 
} from '@aws-sdk/client-scheduler';

export interface SchedulerConfig {
  region: string;
  schedulerRoleArn: string;
}

/**
 * Creates a schedule to automatically destroy the ephemeral environment
 */
export async function createDestructionSchedule(
  stackName: string,
  ttlHours: number,
  config: SchedulerConfig
): Promise<void> {
  const client = new SchedulerClient({ region: config.region });
  const scheduleName = `${stackName}-cleanup`;
  
  // Calculate deletion time
  const deletionTime = new Date();
  deletionTime.setHours(deletionTime.getHours() + ttlHours);
  
  // Create schedule for one-time execution
  const scheduleExpression = `at(${deletionTime.toISOString().slice(0, 19)})`;
  
  try {
    await client.send(new CreateScheduleCommand({
      Name: scheduleName,
      ScheduleExpression: scheduleExpression,
      FlexibleTimeWindow: {
        Mode: 'OFF'
      },
      Target: {
        Arn: 'arn:aws:scheduler:::aws-sdk:cloudformation:deleteStack',
        RoleArn: config.schedulerRoleArn,
        Input: JSON.stringify({
          StackName: stackName
        })
      },
      Description: `Auto-cleanup for ephemeral environment ${stackName}`
    }));
    
    console.log(`✓ Created cleanup schedule: ${scheduleName}`);
    console.log(`  Stack will be deleted at: ${deletionTime.toISOString()}`);
  } catch (error: any) {
    // If schedule already exists, delete and recreate
    if (error.name === 'ConflictException') {
      await deleteDestructionSchedule(stackName, config.region);
      return createDestructionSchedule(stackName, ttlHours, config);
    }
    throw error;
  }
}

/**
 * Deletes the destruction schedule for a stack
 */
export async function deleteDestructionSchedule(
  stackName: string,
  region: string
): Promise<void> {
  const client = new SchedulerClient({ region });
  const scheduleName = `${stackName}-cleanup`;
  
  try {
    await client.send(new DeleteScheduleCommand({
      Name: scheduleName
    }));
    console.log(`✓ Deleted cleanup schedule: ${scheduleName}`);
  } catch (error: any) {
    if (error.name !== 'ResourceNotFoundException') {
      console.warn(`Warning: Failed to delete schedule ${scheduleName}:`, error.message);
    }
  }
}

/**
 * Checks if a destruction schedule exists for a stack
 */
export async function scheduleExists(
  stackName: string,
  region: string
): Promise<boolean> {
  const client = new SchedulerClient({ region });
  const scheduleName = `${stackName}-cleanup`;
  
  try {
    await client.send(new GetScheduleCommand({
      Name: scheduleName
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}
