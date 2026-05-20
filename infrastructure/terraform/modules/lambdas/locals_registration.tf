locals {
  lambdas_registration = {
    "registration-courses-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /registration/courses"
    }
    "registration-course-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /registration/courses"
    }
    "registration-course-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /registration/courses/{id}"
    }
    "registration-course-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /registration/courses/{id}"
    }
    "registration-terms-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /registration/terms"
    }
    "registration-term-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /registration/terms"
    }
    "registration-term-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /registration/terms/{id}"
    }
    "registration-term-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /registration/terms/{id}"
    }
    "registration-sections-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /registration/sections"
    }
    "registration-section-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /registration/sections"
    }
    "registration-section-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /registration/sections/{id}"
    }
    "registration-section-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /registration/sections/{id}"
    }
  }
}
