locals {
  lambdas_admin = {
    "admin-users-list" = {
      policy_arn = var.admin_policy_arn
      route_key  = "GET /admin/users"
    }
    "admin-user-create" = {
      policy_arn = var.admin_policy_arn
      route_key  = "POST /admin/users"
    }
    "admin-user-update" = {
      policy_arn = var.admin_policy_arn
      route_key  = "PUT /admin/users/{id}"
    }
    "admin-user-delete" = {
      policy_arn = var.admin_policy_arn
      route_key  = "DELETE /admin/users/{id}"
    }
  }
}
