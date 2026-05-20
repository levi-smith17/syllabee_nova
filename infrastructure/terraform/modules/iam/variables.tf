variable "project" {
  type = string
}

variable "env" {
  type = string
}

variable "dynamodb_table_arn" {
  type = string
}

variable "cognito_user_pool_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
