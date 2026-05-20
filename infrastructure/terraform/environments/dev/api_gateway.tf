module "api_gateway" {
  source = "../../modules/api_gateway"

  project              = var.project
  env                  = var.env
  cognito_user_pool_id = module.cognito.instructor_user_pool_id
  cognito_client_id    = module.cognito.instructor_client_id
  allow_origins        = concat(var.allow_origins, ["https://${module.web.cloudfront_domain}"])
  lambda_configs       = module.lambdas.api_gateway_configs
  tags                 = local.common_tags
}
