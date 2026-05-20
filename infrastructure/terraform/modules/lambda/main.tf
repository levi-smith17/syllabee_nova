locals {
  parts        = split("-", var.function_name)
  domain       = local.parts[0]
  operation    = join("-", slice(local.parts, 1, length(local.parts)))
  handler_path = "${local.domain}/${local.operation}/handler.handler"
}

data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-${var.function_name}.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: JSON.stringify({ message: 'placeholder' }) });"
    filename = "${local.domain}/${local.operation}/handler.js"
  }
}

resource "aws_lambda_function" "this" {
  function_name    = "${var.project}-${var.env}-${var.function_name}"
  role             = var.execution_role_arn
  handler          = local.handler_path
  runtime          = "nodejs22.x"
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      NODE_ENV             = var.env
      DYNAMODB_TABLE       = var.dynamodb_table_name
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      WEB_URL              = var.web_url
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
