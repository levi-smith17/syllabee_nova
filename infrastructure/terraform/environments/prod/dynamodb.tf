module "dynamodb" {
  source      = "../../modules/dynamodb"
  project     = var.project
  env         = var.env
  enable_pitr = true
  tags        = local.common_tags
}
