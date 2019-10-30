resource "aws_api_gateway_rest_api" "finance_scraper_apigw" {
  name        = "FinanceScraperAPIGateway"
  description = "API Gateway for finance scraper API"
}

# resource "aws_api_gateway_resource" "proxy" {
#   rest_api_id = "${aws_api_gateway_rest_api.example.id}"
#   parent_id   = "${aws_api_gateway_rest_api.example.root_resource_id}"
#   path_part   = "{proxy+}"
# }

# resource "aws_api_gateway_method" "proxy" {
#   rest_api_id   = "${aws_api_gateway_rest_api.example.id}"
#   resource_id   = "${aws_api_gateway_resource.proxy.id}"
#   http_method   = "ANY"
#   authorization = "NONE"
# }

# resource "aws_api_gateway_integration" "lambda" {
#   rest_api_id = "${aws_api_gateway_rest_api.example.id}"
#   resource_id = "${aws_api_gateway_method.proxy.resource_id}"
#   http_method = "${aws_api_gateway_method.proxy.http_method}"

#   integration_http_method = "POST"
#   type                    = "AWS_PROXY"
#   uri                     = "${aws_lambda_function.scraper_api_lambda.invoke_arn}"
# }

# root
resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.finance_scraper_apigw.id
  resource_id   = aws_api_gateway_rest_api.finance_scraper_apigw.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.finance_scraper_apigw.id
  resource_id = aws_api_gateway_method.proxy_root.resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.scraper_api_lambda.invoke_arn
}

# deployment

resource "aws_api_gateway_deployment" "finance_scraper_deployment" {
  depends_on = [aws_api_gateway_integration.lambda_root]

  rest_api_id = aws_api_gateway_rest_api.finance_scraper_apigw.id
  stage_name  = "test"
}

resource "aws_api_gateway_method_settings" "s" {
  rest_api_id = aws_api_gateway_rest_api.finance_scraper_apigw.id
  stage_name  = "test"
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
  }
}

output "base_url" {
  value = aws_api_gateway_deployment.finance_scraper_deployment.invoke_url
}

