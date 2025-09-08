# CloudFront WAF and Logging Setup

This guide outlines how to attach AWS Managed Rules with a rate-limit rule to an existing CloudFront distribution, enable logging to CloudWatch, and run a smoke test to verify that blocked requests are visible in logs. It also documents where to enable Shield Advanced once the distribution is protected.

## 1. Create and attach a Web ACL

```bash
WEB_ACL_NAME="portfolio-waf"
DISTRIBUTION_ID="REPLACE_WITH_DISTRIBUTION_ID"

# Create Web ACL with AWS managed rules and a rate-based rule
aws wafv2 create-web-acl \
  --name "$WEB_ACL_NAME" \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName="$WEB_ACL_NAME" \
  --rules '[
    {
      "Name": "AWS-AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": { "None": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSCommonRules"
      }
    },
    {
      "Name": "RateLimit",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "AggregateKeyType": "IP",
          "Limit": 1000
        }
      },
      "Action": { "Block": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    }
  ]'

# Associate the Web ACL with the CloudFront distribution
WEB_ACL_ARN=$(aws wafv2 list-web-acls --scope CLOUDFRONT --query "WebACLs[?Name=='$WEB_ACL_NAME'].ARN" --output text)
aws wafv2 associate-web-acl --web-acl-arn "$WEB_ACL_ARN" --resource-arn "arn:aws:cloudfront::ACCOUNT_ID:distribution/$DISTRIBUTION_ID"
```

## 2. Enable logging to CloudWatch

```bash
# Create a CloudWatch log group for WAF logs
LOG_GROUP="/aws/cloudfront/$WEB_ACL_NAME"
aws logs create-log-group --log-group-name "$LOG_GROUP" 2>/dev/null || true

# Send WAF logs to the log group
aws wafv2 put-logging-configuration \
  --logging-configuration "ResourceArn=$WEB_ACL_ARN,LogDestinationConfigs=arn:aws:logs:REGION:ACCOUNT_ID:log-group:$LOG_GROUP"

# Enable standard CloudFront access logging to the same log group
aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --distribution-config file://distribution-config.json \
  --if-match $(aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" --query "ETag" --output text)
```

`distribution-config.json` must include a `Logging` section with `Destination` set to the CloudWatch log group ARN.

## 3. Smoke test

Run the helper script to generate a synthetic bad request and verify that it is blocked and logged:

```bash
DISTRIBUTION_DOMAIN="d123.cloudfront.net" \ 
./scripts/cloudfront-waf-smoketest.sh
```

The script sends a request containing a basic XSS payload. A `403` response indicates the WAF blocked the request. Use the following command to tail recent log entries:

```bash
aws logs tail "$LOG_GROUP" --since 5m
```

## 4. Enable Shield Advanced

After verifying that the Web ACL is functioning and logs are visible, enroll the distribution in [AWS Shield Advanced](https://docs.aws.amazon.com/waf/latest/developerguide/enable-ddos-protection.html) to receive enhanced DDoS protection and advanced metrics.

