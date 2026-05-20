output "api_gateway_configs" {
  value = {
    for name, config in local.all_lambdas : name => {
      invoke_arn    = module.lambda[name].invoke_arn
      function_name = module.lambda[name].function_name
      route_key     = config.route_key
    }
  }
}
