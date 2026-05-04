from api.user_endpoints import lambda_handler

# AWS Lambda looks for lambda_function.lambda_handler by default.
# This file simply points AWS to our correct router in the api folder!
