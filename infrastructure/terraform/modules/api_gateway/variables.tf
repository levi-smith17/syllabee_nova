variable "project" {
  type = string
}

variable "env" {
  type = string
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_client_id" {
  type = string
}

variable "allow_origins" {
  type    = list(string)
  default = ["*"]
}

variable "lambda_configs" {
  type = map(object({
    invoke_arn    = string
    function_name = string
    route_key     = string
  }))
}

variable "tags" {
  type    = map(string)
  default = {}
}
