module "cognito" {
  source  = "../../modules/cognito"
  project = var.project
  env     = var.env
  tags    = local.common_tags
}
