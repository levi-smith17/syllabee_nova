variable "project" {
  type    = string
  default = "syllabee"
}

variable "env" {
  type    = string
  default = "prod"
}

variable "owner" {
  type = string
}

variable "aws_profile" {
  type    = string
  default = ""
}

variable "web_url" {
  type = string
}

variable "allow_origins" {
  type    = list(string)
  default = ["*"]
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in owner/name format (e.g., acme/syllabee-nova)"
}

variable "create_oidc_provider" {
  type        = bool
  default     = false
  description = "Set to true only if prod is in a different AWS account than dev"
}
