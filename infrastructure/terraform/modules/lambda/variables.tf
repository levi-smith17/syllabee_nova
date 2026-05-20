variable "project" {
  type = string
}

variable "env" {
  type = string
}

variable "function_name" {
  type = string
}

variable "execution_role_arn" {
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

variable "tags" {
  type    = map(string)
  default = {}
}
