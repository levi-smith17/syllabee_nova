locals {
  lambdas_editor = {
    "editor-block-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments/{segment_id}/blocks"
    }
    "editor-block-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/syllabi/{id}/segments/{segment_id}/blocks/{block_id}"
    }
    "editor-block-reorder" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments/{segment_id}/blocks/reorder"
    }
    "editor-block-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/syllabi/{id}/segments/{segment_id}/blocks/{block_id}"
    }
    "editor-grading-scale-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/grading-scales"
    }
    "editor-grading-scale-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/grading-scales/{id}"
    }
    "editor-grading-scale-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/grading-scales/{id}"
    }
    "editor-grading-scales-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /editor/grading-scales"
    }
    "editor-segment-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments"
    }
    "editor-segment-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/syllabi/{id}/segments/{segment_id}"
    }
    "editor-segment-reorder" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/segments/reorder"
    }
    "editor-segment-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/syllabi/{id}/segments/{segment_id}"
    }
    "editor-syllabi-list" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /editor/syllabi"
    }
    "editor-syllabus-create" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi"
    }
    "editor-syllabus-delete" = {
      policy_arn = var.dynamodb_delete_policy_arn
      route_key  = "DELETE /editor/syllabi/{id}"
    }
    "editor-syllabus-get" = {
      policy_arn = var.dynamodb_read_policy_arn
      route_key  = "GET /editor/syllabi/{id}"
    }
    "editor-syllabus-lock" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "POST /editor/syllabi/{id}/lock"
    }
    "editor-syllabus-update" = {
      policy_arn = var.dynamodb_write_policy_arn
      route_key  = "PUT /editor/syllabi/{id}"
    }
  }
}
