output "api_url" {
  value = module.api_gateway.api_url
}

output "web_url" {
  value = "https://${module.web.cloudfront_domain}"
}

output "web_bucket" {
  value = module.web.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.web.cloudfront_distribution_id
}

output "instructor_user_pool_id" {
  value = module.cognito.instructor_user_pool_id
}

output "instructor_client_id" {
  value = module.cognito.instructor_client_id
}

output "student_user_pool_id" {
  value = module.cognito.student_user_pool_id
}

output "student_client_id" {
  value = module.cognito.student_client_id
}

output "github_actions_role_arn" {
  value = module.github_oidc.role_arn
}
