module "web" {
  source  = "../../modules/web"
  project = var.project
  env     = var.env
  tags    = local.common_tags
}
