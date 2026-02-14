# Permission Request Guide

このガイドでは、エージェントや開発者がCloudFormation経由で権限の増加をリクエストする方法を説明します。

This guide explains how agents and developers can request permission increases via CloudFormation.

## Overview

The ephemeral environment system uses IAM Permission Boundaries to limit what can be done. If you need additional permissions, you must request them from administrators who can update the CloudFormation stack.

## Current Limitations

The permission boundary (`EphemeralPermissionBoundary`) currently allows:

### ✅ Allowed Services
- EC2, S3, Lambda, DynamoDB, RDS
- CloudFormation, CloudWatch, CloudWatch Logs
- EventBridge, EventBridge Scheduler
- SNS, SQS, API Gateway
- ECS, ECR
- Route53, ACM
- Secrets Manager, Systems Manager
- KMS

### ✅ Allowed IAM Operations
- Read operations: `Get*`, `List*`
- Limited write operations for `eph-*` roles only
- PassRole for ephemeral resources

### ❌ Restricted Operations
- Creating/modifying IAM users
- Modifying this CloudFormation stack
- Modifying permission boundaries
- Creating roles without `eph-` prefix
- Direct IAM policy modifications

## Requesting Additional Permissions

If you need permissions that are not currently allowed, follow these steps:

### Step 1: Identify Required Permissions

Document exactly what permissions you need:

```yaml
# Example: Need to use Step Functions
Required Service: AWS Step Functions
Required Actions:
  - states:CreateStateMachine
  - states:DeleteStateMachine
  - states:UpdateStateMachine
  - states:StartExecution
  - states:StopExecution
  - states:DescribeStateMachine
  - states:ListStateMachines

Justification:
  We need to deploy and test Step Functions workflows in ephemeral environments
  for our new order processing system.

Resources:
  All Step Functions resources (arn:aws:states:*:ACCOUNT_ID:stateMachine:eph-*)
```

### Step 2: Create a Permission Request

Create a file `permission-request.yaml` in your repository:

```yaml
requestedBy: agent-name or developer-name
requestDate: 2026-02-14
purpose: Brief description of why these permissions are needed

permissions:
  - service: AWS Step Functions
    actions:
      - states:*
    resources:
      - arn:aws:states:*:*:stateMachine:eph-*
      - arn:aws:states:*:*:execution:eph-*/*
    
  - service: AWS Glue
    actions:
      - glue:CreateJob
      - glue:DeleteJob
      - glue:StartJobRun
      - glue:GetJob
    resources:
      - arn:aws:glue:*:*:job/eph-*

justification: |
  We are building a data processing pipeline that requires:
  1. Step Functions for orchestration
  2. Glue jobs for ETL operations
  
  These permissions are scoped to only ephemeral resources (eph-* prefix)
  to maintain security boundaries.

alternatives_considered: |
  - Using Lambda for ETL: Not suitable due to 15-minute timeout
  - Using ECS for orchestration: More complex and costly for our use case
```

### Step 3: Submit Request to Administrators

Send the permission request to your AWS administrators via:

1. **GitHub Issue**: Create an issue in your repository
2. **Pull Request**: Submit a PR with the request file
3. **Email/Slack**: Send to your DevOps/Platform team
4. **Ticketing System**: Create a ticket in Jira/ServiceNow

### Step 4: Administrator Reviews Request

Administrators will:

1. Review the requested permissions
2. Verify they are scoped appropriately (eph-* prefix)
3. Ensure they don't bypass security boundaries
4. Approve or request modifications

### Step 5: CloudFormation Stack Update

Once approved, administrators will update the CloudFormation stack:

```bash
# Download current template
aws cloudformation get-template \
  --stack-name EphemeralStack \
  --query 'TemplateBody' \
  --output text > current-template.yaml

# Edit the EphemeralPermissionBoundary policy
# Add new permissions under AllowMostServices statement

# Update the stack
aws cloudformation update-stack \
  --stack-name EphemeralStack \
  --template-body file://updated-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for update to complete
aws cloudformation wait stack-update-complete --stack-name EphemeralStack
```

### Step 6: Verify New Permissions

After the update:

```bash
# Test the new permissions
cdkeph deploy
```

## Example CloudFormation Update

Here's an example of how administrators would add Step Functions permissions:

```yaml
# In cloudformation/oidc-roles.yaml
# Under EphemeralPermissionBoundary -> PolicyDocument -> Statement

- Sid: AllowMostServices
  Effect: Allow
  Action:
    # ... existing services ...
    - 'states:*'  # Add Step Functions
    - 'glue:*'    # Add Glue
  Resource: '*'
```

For more granular control:

```yaml
- Sid: AllowStepFunctionsForEphemeral
  Effect: Allow
  Action:
    - 'states:CreateStateMachine'
    - 'states:DeleteStateMachine'
    - 'states:UpdateStateMachine'
    - 'states:StartExecution'
    - 'states:StopExecution'
    - 'states:DescribeStateMachine'
    - 'states:ListStateMachines'
  Resource:
    - !Sub 'arn:aws:states:*:${AWS::AccountId}:stateMachine:eph-*'
    - !Sub 'arn:aws:states:*:${AWS::AccountId}:execution:eph-*/*'
```

## Security Considerations for Administrators

When reviewing permission requests, verify:

1. **Least Privilege**: Only grant minimum required permissions
2. **Resource Scoping**: Limit to `eph-*` resources when possible
3. **No Boundary Bypass**: Ensure permissions don't allow modifying the boundary
4. **No Stack Modification**: Prevent self-modification of the CloudFormation stack
5. **Time-Limited**: Consider if permission should be temporary
6. **Audit Trail**: Document who requested and why

## Automatic Permission Requests (Future)

### For Agents

Agents could automatically generate permission requests:

```typescript
// Example: Agent-generated permission request
const permissionRequest = {
  requestedBy: 'ai-agent-v1',
  task: 'Deploy machine learning pipeline',
  detectedMissingPermissions: [
    'sagemaker:CreateModel',
    'sagemaker:CreateEndpoint'
  ],
  proposedScope: {
    service: 'SageMaker',
    actions: ['sagemaker:*'],
    resources: ['arn:aws:sagemaker:*:*:*/eph-*']
  },
  autoGenerated: true,
  requiresHumanApproval: true
};
```

The agent would:
1. Detect permission denied errors
2. Generate permission request
3. Create GitHub issue or PR
4. Wait for human approval
5. Retry deployment after approval

## Common Permission Patterns

### Pattern 1: New AWS Service

```yaml
permissions:
  - service: ServiceName
    actions:
      - service:*
    resources:
      - arn:aws:service:*:ACCOUNT:resource/eph-*
```

### Pattern 2: Cross-Service Integration

```yaml
permissions:
  - service: Lambda
    actions:
      - lambda:InvokeFunction
    resources:
      - arn:aws:lambda:*:ACCOUNT:function:eph-*
  
  - service: EventBridge
    actions:
      - events:PutEvents
    resources:
      - arn:aws:events:*:ACCOUNT:event-bus/eph-*
```

### Pattern 3: Read-Only Access

```yaml
permissions:
  - service: CloudTrail
    actions:
      - cloudtrail:LookupEvents
      - cloudtrail:GetTrailStatus
    resources:
      - '*'
```

## Denied Request Examples

These requests would typically be denied:

### ❌ Too Broad Scope
```yaml
# BAD: No resource restrictions
permissions:
  - service: S3
    actions:
      - s3:*
    resources:
      - '*'  # Allows access to ALL S3 buckets
```

### ❌ Boundary Bypass Attempt
```yaml
# BAD: Trying to modify IAM policies
permissions:
  - service: IAM
    actions:
      - iam:CreatePolicy
      - iam:AttachUserPolicy
    resources:
      - '*'
```

### ❌ Stack Self-Modification
```yaml
# BAD: Attempting to modify the CloudFormation stack
permissions:
  - service: CloudFormation
    actions:
      - cloudformation:UpdateStack
    resources:
      - arn:aws:cloudformation:*:*:stack/EphemeralStack/*
```

## FAQ

**Q: How long does approval take?**
A: Typically 1-2 business days, depending on your organization's process.

**Q: Can I bypass the permission boundary?**
A: No, this is intentional. The boundary ensures security constraints.

**Q: What if I need permissions urgently?**
A: Contact your administrators directly and explain the urgency.

**Q: Can agents automatically approve their own requests?**
A: No, human approval is always required to maintain security.

**Q: What happens to existing environments after permission update?**
A: They automatically inherit the new permissions from the updated boundary.

## Contact

For questions about permissions, contact your AWS administrators or DevOps team.
