provider "aws" {
  region  = "us-east-2"
  profile = var.aws_profile != "" ? var.aws_profile : null
}
