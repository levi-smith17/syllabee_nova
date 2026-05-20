# Instructor pool — password auth
resource "aws_cognito_user_pool" "instructor" {
  name = "${var.project}-${var.env}-instructors"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = var.tags
}

resource "aws_cognito_user_pool_client" "instructor_web" {
  name         = "instructor-web"
  user_pool_id = aws_cognito_user_pool.instructor.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
  ]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

# Student pool — LTI custom auth only
resource "aws_cognito_user_pool" "student" {
  name = "${var.project}-${var.env}-students"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  # Students set no password — LTI is the only auth method
  password_policy {
    minimum_length                   = 20
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 1
  }

  /*lambda_config {
    define_auth_challenge          = aws_lambda_function.cognito_define_auth.arn
    create_auth_challenge          = aws_lambda_function.cognito_create_auth.arn
    verify_auth_challenge_response = aws_lambda_function.cognito_verify_auth.arn
  }*/

  schema {
    name                     = "lti_sub"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  tags = var.tags
}

resource "aws_cognito_user_pool_client" "student_web" {
  name         = "student-web"
  user_pool_id = aws_cognito_user_pool.student.id

  explicit_auth_flows = [
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 1

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}