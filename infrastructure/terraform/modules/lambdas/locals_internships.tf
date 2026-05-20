locals {
  lambdas_internships = {
    "internship-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /internship"
    }
    "internship-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /internship/{id}"
    }
    "internship-get" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /internship/{id}"
    }
    "internship-journal-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /internship/{id}/journal"
    }
    "internship-journal-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /internship/{id}/journal/{entry_id}"
    }
    "internship-journal-verify" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /internship/{id}/journal/{entry_id}"
    }
    "internship-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /internship"
    }
    "internship-location-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /internship/{id}/locations"
    }
    "internship-location-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /internship/{id}/locations/{location_id}"
    }
    "internship-location-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /internship/{id}/locations/{location_id}"
    }
    "internship-settings-get" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /internship/settings"
    }
    "internship-settings-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /internship/settings"
    }
    "internship-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /internship/{id}"
    }
  }
}
