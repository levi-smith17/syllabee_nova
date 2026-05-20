module "github_oidc" {
  source = "../../modules/github_oidc"

  project              = var.project
  env                  = var.env
  github_repo          = var.github_repo
  state_bucket         = "syllabee-${var.env}-terraform-state"
  create_oidc_provider = var.create_oidc_provider
  tags                 = local.common_tags
}
