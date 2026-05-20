#!/usr/bin/env bash
# One-time setup: creates the S3 bucket used for Terraform state.
# Run this once per environment before the first `terraform init`.
# State locking uses S3 native locking (use_lockfile = true) — no DynamoDB needed.
#
# Usage:
#   ./infrastructure/scripts/bootstrap.sh <env> [aws-profile]
#
# Examples:
#   ./infrastructure/scripts/bootstrap.sh dev
#   ./infrastructure/scripts/bootstrap.sh dev syllabee-dev
#   AWS_PROFILE=syllabee-dev ./infrastructure/scripts/bootstrap.sh dev

set -euo pipefail

ENV=${1:?Usage: bootstrap.sh <env> [aws-profile]}
PROFILE=${2:-${AWS_PROFILE:-}}
REGION="us-east-2"
BUCKET="syllabee-${ENV}-terraform-state"

# Build a shared --profile flag if a profile was given
PROFILE_FLAG=""
if [ -n "${PROFILE}" ]; then
  PROFILE_FLAG="--profile ${PROFILE}"
fi

echo "Bootstrapping Terraform backend for: ${ENV}"
echo "  S3 bucket: ${BUCKET}"
echo "  Region:    ${REGION}"
[ -n "${PROFILE}" ] && echo "  Profile:   ${PROFILE}"
echo ""

# S3 bucket — us-east-1 must NOT include LocationConstraint; all other regions must
if aws s3api head-bucket --bucket "${BUCKET}" --region "${REGION}" ${PROFILE_FLAG} 2>/dev/null; then
  echo "✓ Bucket ${BUCKET} already exists"
else
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" ${PROFILE_FLAG}
  else
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" \
      --create-bucket-configuration LocationConstraint="${REGION}" ${PROFILE_FLAG}
  fi
  echo "✓ Created bucket ${BUCKET}"
fi

aws s3api put-bucket-versioning \
  --bucket "${BUCKET}" \
  --versioning-configuration Status=Enabled \
  ${PROFILE_FLAG}

aws s3api put-bucket-encryption \
  --bucket "${BUCKET}" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  ${PROFILE_FLAG}

echo ""
echo "Done! Run 'terraform init' in infrastructure/terraform/environments/${ENV}/"
