import json
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    """ Converts DynamoDB Decimals to native Python numbers for JSON serialization. """
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

class LambdaManager:
    """
    Helper class to standardize API Gateway Lambda requests and responses.
    """
    @staticmethod
    def parse_event(event):
        """Extracts useful info from an API Gateway Lambda Proxy event."""
        # Parse body
        body = {}
        if event.get('body'):
            try:
                body_string = event['body']
                # If API Gateway proxy integration encodes it in base64 occasionally, 
                # be mindful, but usually it's just a stringified JSON.
                body = json.loads(body_string)
            except Exception as e:
                print(f"Failed to parse body: {e}")
                pass
                
        # Parse parameters
        path_params = event.get('pathParameters') or {}
        query_params = event.get('queryStringParameters') or {}
        
        # Extract User ID from Cognito Authorizer (if attached to API Gateway)
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        user_id = claims.get('sub') # 'sub' is the standard Cognito unique user ID field
        
        return {
            'body': body,
            'path_params': path_params,
            'query_params': query_params,
            'user_id': user_id
        }

    @staticmethod
    def success_response(data, status_code=200):
        """Returns a generic HTTP success response with CORS headers."""
        # Convert any decimals or specific boto3 types if necessary before this step!
        return {
            'statusCode': status_code,
            'headers': {
                'Access-Control-Allow-Origin': '*', # Adjust for production security
                'Access-Control-Allow-Credentials': True,
                'Content-Type': 'application/json'
            },
            'body': json.dumps(data, cls=DecimalEncoder)
        }
        
    @staticmethod
    def error_response(message, status_code=400):
        """Returns a generic HTTP error response with CORS headers."""
        return {
            'statusCode': status_code,
            'headers': {
                'Access-Control-Allow-Origin': '*', 
                'Access-Control-Allow-Credentials': True,
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': message})
        }
