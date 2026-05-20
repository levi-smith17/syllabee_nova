module "dynamodb" {
  source  = "../../modules/dynamodb"
  project = var.project
  env     = var.env
  tags    = local.common_tags
}
