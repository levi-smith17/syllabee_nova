locals {
  lambdas_viewer = {
    "viewer-get" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /viewer/{courseCode}/{sectionCode}/{termCode}"
    }
  }
}
