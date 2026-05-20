variable "allow_origins" {
  type    = list(string)
  default = ["*"]
}

variable "aws_profile" {
  type    = string
  default = ""
}

variable "create_oidc_provider" {
  type    = bool
  default = false
}

variable "env" {
  type    = string
  default = "dev"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in owner/name format (e.g., acme/syllabee-nova)"
}

variable "owner" {
  type = string
}

variable "project" {
  type    = string
  default = "syllabee"
}

variable "web_url" {
  type = string
}