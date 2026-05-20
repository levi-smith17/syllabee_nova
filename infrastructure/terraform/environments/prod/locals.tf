locals {
  common_tags = {
    environment  = var.env
    managed_by   = "terraform"
    owner        = var.owner
    project      = var.project
  }
}
