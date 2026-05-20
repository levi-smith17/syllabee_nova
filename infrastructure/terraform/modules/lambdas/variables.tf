variable "project" {
  type = string
}

variable "env" {
  type = string
}

variable "execution_role_arn" {
  type = string
}

variable "lambda_role_name" {
  type = string
}

variable "dynamodb_table_name" {
  type = string
}

variable "cognito_user_pool_id" {
  type = string
}

variable "web_url" {
  type = string
}

variable "dynamodb_read_policy_arn" {
  type = string
}

variable "dynamodb_write_policy_arn" {
  type = string
}

variable "dynamodb_delete_policy_arn" {
  type = string
}

variable "admin_policy_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
