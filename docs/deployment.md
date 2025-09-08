# Static Deployment

This project can be exported to a fully static site and served from AWS.
The S3 bucket is configured as a **private origin** behind a CloudFront
 distribution.  CloudFront uses an **Origin Access Control (OAC)** so the
 bucket does not need to enable the S3 website endpoint or allow public
 access.  A WAF web ACL provides basic protection and can be extended
 with additional rules.

## Provisioning

Infrastructure is defined in [`infra/main.tf`](../infra/main.tf).
To deploy the resources:

```bash
cd infra
terraform init
terraform apply
```

The outputs include the S3 bucket name and CloudFront domain used for the
site.

## Build and Upload

```bash
yarn export
aws s3 sync out/ s3://<bucket-name> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

Access the site through the CloudFront domain (or a custom domain pointing
to it).  Do **not** use the S3 website endpoint, which remains disabled.
