output "role_arn" {
  value = aws_iam_role.lambda_exec.arn
}

output "role_name" {
  value = aws_iam_role.lambda_exec.name
}

output "dynamodb_read_policy_arn" {
  value = aws_iam_policy.dynamodb_read.arn
}

output "dynamodb_write_policy_arn" {
  value = aws_iam_policy.dynamodb_write.arn
}

output "dynamodb_delete_policy_arn" {
  value = aws_iam_policy.dynamodb_delete.arn
}

output "admin_policy_arn" {
  value = aws_iam_policy.admin.arn
}
