module "lambdas" {
  source = "../../modules/lambdas"

  project                    = var.project
  env                        = var.env
  execution_role_arn         = module.iam.role_arn
  lambda_role_name           = module.iam.role_name
  dynamodb_table_name        = module.dynamodb.table_name
  cognito_user_pool_id       = module.cognito.instructor_user_pool_id
  web_url                    = var.web_url
  dynamodb_read_policy_arn   = module.iam.dynamodb_read_policy_arn
  dynamodb_write_policy_arn  = module.iam.dynamodb_write_policy_arn
  dynamodb_delete_policy_arn = module.iam.dynamodb_delete_policy_arn
  admin_policy_arn           = module.iam.admin_policy_arn
  tags                       = local.common_tags
}
