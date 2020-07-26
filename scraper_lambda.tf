resource "aws_lambda_function" "scraper_lambda" {
  function_name    = "scraper_lambda"
  handler          = "lib/scraper_index.handler"
  runtime          = "nodejs12.x"
  filename         = ".serverless/finance_scraper.zip"
  source_code_hash = filebase64sha256(".serverless/finance_scraper.zip")
  role             = aws_iam_role.scraper_role.arn
  timeout          = "120"
}

resource "aws_iam_role" "scraper_role" {
  name = "scraper_role"

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

resource "aws_iam_policy" "scraper_policy" {
  name        = "scraper_policy"
  description = "Policy for the scraper to access AWS services"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:Scan",
            "dynamodb:Query"
        ],
        "Effect": "Allow",
        "Sid": "AllowsMinimalDynamodb",
        "Resource": "${aws_dynamodb_table.finance_scraper.arn}"
      },
      {
          "Action": [
              "s3:PutObject",
              "s3:ListBucket"
          ],
          "Resource": [
              "${aws_s3_bucket.scraper_bucket.arn}/*",
              "${aws_s3_bucket.scraper_bucket.arn}"
          ],
          "Effect": "Allow",
          "Sid": "AllowsMinimalS3"
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

resource "aws_cloudwatch_event_rule" "scrape_every_8_hours" {
  name                = "scrape_every_8_hours"
  schedule_expression = "rate(8 hours)"
  description         = "Call finance scraper every 8 hours"
}

resource "aws_cloudwatch_event_target" "scraper_cloudwatch_target_8hours" {
  rule = aws_cloudwatch_event_rule.scrape_every_8_hours.name
  arn  = aws_lambda_function.scraper_lambda.arn

  input = <<DOC
{
  "isins": [
    "LU0839027447",
    "NO0010140502",
    "SE0005991445",
    "FI0008803812",
    "IE00B52MJY50",
    "IE00B4L5Y983",
    "SE0005993102",
    "FI0008800321",
    "LU0274211480",
    "LU0380865021",
    "FI0009013403",
    "SE0002756973",
    "IE00B5BMR087"
  ]
}
DOC

}

resource "aws_cloudwatch_event_rule" "scrape_every_day" {
  name                = "scrape_every_day"
  schedule_expression = "rate(1 day)"
  description         = "Call finance scraper every day"
}

resource "aws_cloudwatch_event_target" "scraper_cloudwatch_target_daily" {
  rule = aws_cloudwatch_event_rule.scrape_every_day.name
  arn  = aws_lambda_function.scraper_lambda.arn

  input = <<DOC
{
  "isins": [
    "FI0008801980",
    "FI0008801733",
    "FI0008801790"
  ]
}
DOC

}

resource "aws_lambda_permission" "allow_cloudwatch_to_execute_scraper_8hours" {
  statement_id  = "AllowScraperExecutionFromCloudWatch8Hours"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scraper_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scrape_every_8_hours.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_execute_scraper_daily" {
  statement_id  = "AllowScraperExecutionFromCloudWatchDaily"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scraper_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scrape_every_day.arn
}
