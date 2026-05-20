locals {
  lambdas_quicklinks = {
    "quicklinks-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /admin/quick-links"
    }
    "quicklinks-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /admin/quick-links"
    }
    "quicklinks-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /admin/quick-links/{id}"
    }
    "quicklinks-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /admin/quick-links/{id}"
    }
  }
}
