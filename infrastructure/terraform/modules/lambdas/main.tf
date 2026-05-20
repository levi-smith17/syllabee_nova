locals {
  all_lambdas = merge(
    local.lambdas_admin,
    local.lambdas_quicklinks,
    local.lambdas_registration,
    local.lambdas_settings,
  )

  unique_policy_arns = {
    for fn_name, fn in local.all_lambdas : fn_name => fn.policy_arn
  }
}

module "lambda" {
  source   = "../lambda"
  for_each = local.all_lambdas

  project              = var.project
  env                  = var.env
  function_name        = each.key
  execution_role_arn   = var.execution_role_arn
  dynamodb_table_name  = var.dynamodb_table_name
  cognito_user_pool_id = var.cognito_user_pool_id
  web_url              = var.web_url
  tags                 = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  for_each = local.unique_policy_arns

  role       = var.lambda_role_name
  policy_arn = each.value
}
