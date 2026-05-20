module "github_oidc" {
  source = "../../modules/github_oidc"

  create_oidc_provider = var.create_oidc_provider
  project              = var.project
  env                  = var.env
  github_repo          = var.github_repo
  state_bucket         = "syllabee-${var.env}-terraform-state"
  tags                 = local.common_tags
}
