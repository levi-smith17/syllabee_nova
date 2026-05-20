module "iam" {
  source                = "../../modules/iam"
  project               = var.project
  env                   = var.env
  dynamodb_table_arn    = module.dynamodb.table_arn
  cognito_user_pool_arn = module.cognito.instructor_user_pool_arn
  tags                  = local.common_tags
}
