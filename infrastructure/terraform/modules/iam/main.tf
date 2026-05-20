resource "aws_iam_role" "lambda_exec" {
  name = "${var.project}-${var.env}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "dynamodb_read" {
  name = "${var.project}-${var.env}-lambda-dynamodb-read"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:BatchGetItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
      ]
      Resource = [
        var.dynamodb_table_arn,
        "${var.dynamodb_table_arn}/index/*",
      ]
    }]
  })
}

resource "aws_iam_policy" "dynamodb_write" {
  name = "${var.project}-${var.env}-lambda-dynamodb-write"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:TransactWriteItems",
        "dynamodb:UpdateItem",
      ]
      Resource = [
        var.dynamodb_table_arn,
        "${var.dynamodb_table_arn}/index/*",
      ]
    }]
  })
}

resource "aws_iam_policy" "dynamodb_delete" {
  name = "${var.project}-${var.env}-lambda-dynamodb-delete"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
      ]
      Resource = [
        var.dynamodb_table_arn,
        "${var.dynamodb_table_arn}/index/*",
      ]
    }]
  })
}

resource "aws_iam_policy" "admin" {
  name = "${var.project}-${var.env}-lambda-admin"
  tags = var.tags

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:TransactWriteItems",
          "dynamodb:UpdateItem",
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:ListUsers",
        ]
        Resource = var.cognito_user_pool_arn
      },
    ]
  })
}
