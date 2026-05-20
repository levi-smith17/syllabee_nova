variable "project" {
  type = string
}

variable "env" {
  type = string
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in owner/name format (e.g., acme/syllabee-nova)"
}

variable "state_bucket" {
  type        = string
  description = "S3 bucket name used for Terraform state"
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set to false if the GitHub OIDC provider already exists in this AWS account (e.g., created by another environment)"
}

variable "tags" {
  type    = map(string)
  default = {}
}
