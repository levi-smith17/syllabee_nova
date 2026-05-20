output "instructor_user_pool_id" {
  value = aws_cognito_user_pool.instructor.id
}

output "instructor_user_pool_arn" {
  value = aws_cognito_user_pool.instructor.arn
}

output "instructor_client_id" {
  value = aws_cognito_user_pool_client.instructor_web.id
}

output "student_user_pool_id" {
  value = aws_cognito_user_pool.student.id
}

output "student_user_pool_arn" {
  value = aws_cognito_user_pool.student.arn
}

output "student_client_id" {
  value = aws_cognito_user_pool_client.student_web.id
}