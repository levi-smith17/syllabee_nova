resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = var.tags
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project}-${var.env}-github-actions"
  tags = var.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_policy" "terraform_state" {
  name = "${var.project}-${var.env}-github-terraform-state"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
      ]
      Resource = [
        "arn:aws:s3:::${var.state_bucket}",
        "arn:aws:s3:::${var.state_bucket}/*",
      ]
    }]
  })
}

resource "aws_iam_policy" "lambda_deploy" {
  name = "${var.project}-${var.env}-github-lambda-deploy"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "lambda:GetFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
      ]
      Resource = "arn:aws:lambda:*:*:function:${var.project}-${var.env}-*"
    }]
  })
}

resource "aws_iam_policy" "terraform_aws" {
  name = "${var.project}-${var.env}-github-terraform-aws"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cloudfront:*",
        "cognito-idp:*",
        "dynamodb:*",
        "lambda:*",
        "apigateway:*",
        "iam:*",
        "logs:*",
        "s3:*",
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_state" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.terraform_state.arn
}

resource "aws_iam_role_policy_attachment" "lambda_deploy" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.lambda_deploy.arn
}

resource "aws_iam_role_policy_attachment" "terraform_aws" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.terraform_aws.arn
}
