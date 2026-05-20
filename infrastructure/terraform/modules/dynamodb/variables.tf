variable "project" {
  type = string
}

variable "env" {
  type = string
}

variable "billing_mode" {
  type    = string
  default = "PAY_PER_REQUEST"
}

variable "enable_pitr" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
