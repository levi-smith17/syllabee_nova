locals {
  lambdas_settings = {
    "settings-get" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /settings"
    }
    "settings-branding-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /settings/branding"
    }
    "settings-format-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /settings/formats"
    }
    "settings-format-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /settings/formats/{id}"
    }
    "settings-format-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /settings/formats/{id}"
    }
    "settings-rule-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /settings/rules"
    }
    "settings-rule-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /settings/rules/{id}"
    }
    "settings-rule-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /settings/rules/{id}"
    }
    "settings-term-length-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /settings/term-lengths"
    }
    "settings-term-length-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /settings/term-lengths/{id}"
    }
    "settings-term-length-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /settings/term-lengths/{id}"
    }
  }
}
