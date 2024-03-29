resource "aws_iam_role_policy_attachment" "scraper-policy-attach" {
  role       = aws_iam_role.scraper_role.name
  policy_arn = aws_iam_policy.scraper_policy.arn
}

resource "aws_lambda_function" "scraper_api_lambda" {
  function_name    = "scraper_api_lambda"
  handler          = "lib/api_index.handler"
  runtime          = "nodejs14.x"
  filename         = "build/finance_scraper.zip"
  source_code_hash = filebase64sha256("build/finance_scraper.zip")
  role             = aws_iam_role.scraper_api_role.arn
  timeout          = "120"
  // X-Ray
  tracing_config {
    mode = "Active"
  }
}

resource "aws_iam_role" "scraper_api_role" {
  name = "scraper_api_role"

  assume_role_policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": "AllowsLambdaToExecute"
      }
    ]
  }
EOF

}

resource "aws_iam_policy" "scraper_api_policy" {
  name        = "scraper_api_policy"
  description = "Policy for the scraper API to access AWS services"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
            "dynamodb:Scan",
            "dynamodb:Query"
        ],
        "Effect": "Allow",
        "Sid": "AllowsMinimalDynamodbRead",
        "Resource": "${aws_dynamodb_table.finance_scraper.arn}"
      },
      {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow",
      "Sid": "AllowLogToCloudWatch"
      }
    ]
  }
EOF

}

resource "aws_iam_role_policy_attachment" "scraper-api-policy-attach" {
  role       = aws_iam_role.scraper_api_role.name
  policy_arn = aws_iam_policy.scraper_api_policy.arn
}

resource "aws_iam_role_policy_attachment" "scraper-api-allow-aws_xray_write_only_access" {
  role       = aws_iam_role.scraper_api_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scraper_api_lambda.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.finance_scraper_deployment.execution_arn}/*/*"
}

