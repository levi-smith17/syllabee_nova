locals {
  lambdas_editor = {
    "block-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments/{segment_id}/blocks"
    }
    "block-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/syllabi/{id}/segments/{segment_id}/blocks/{block_id}"
    }
    "block-reorder" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments/{segment_id}/blocks/reorder"
    }
    "block-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/syllabi/{id}/segments/{segment_id}/blocks/{block_id}"
    }
    "grading-scale-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/grading-scales"
    }
    "grading-scale-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/grading-scales/{id}"
    }
    "grading-scale-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/grading-scales/{id}"
    }
    "grading-scales-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /editor/grading-scales"
    }
    "segment-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments"
    }
    "segment-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/syllabi/{id}/segments/{segment_id}"
    }
    "segment-reorder" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments/reorder"
    }
    "segment-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/syllabi/{id}/segments/{segment_id}"
    }
    "syllabi-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /editor/syllabi"
    }
    "syllabus-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi"
    }
    "syllabus-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/syllabi/{id}"
    }
    "syllabus-get" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /editor/syllabi/{id}"
    }
    "syllabus-lock" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/lock"
    }
    "syllabus-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/syllabi/{id}"
    }
  }
}
