import sys

import os
# Ensure the parent directory is in the Python path so we can import core modules 
# accurately when AWS Lambda dynamically loads 'api.user_endpoints'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db_manager import DbManager
from core.lambda_manager import LambdaManager

# Initialize DbManager outside the handler so AWS Lambda can reuse the connection
db = DbManager()

def lambda_handler(event, context):
    """
    Main Router: Directs traffic based on the HTTP Method (GET vs POST).
    """
    # The HTTP API Gateway provides the method in requestContext.http.method
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    
    if method == 'GET':
        return get_user_profile(event, context)
    elif method == 'POST':
        return update_user_profile(event, context)
    else:
        return LambdaManager.error_response(f"Method {method} not supported", 405)


def get_user_profile(event, context):
    """Retrieves a user's profile."""
    try:
        parsed = LambdaManager.parse_event(event)
        
        user_id = parsed.get('user_id') 
        if not user_id and 'userId' in parsed['query_params']:
            user_id = parsed['query_params']['userId']
        
        if not user_id:
            return LambdaManager.error_response("Missing userId parameter or unauthorized request", 401)
            
        user_data = db.get_user(user_id)
        
        if not user_data:
            return LambdaManager.error_response("User profile not found", 404)
            
        return LambdaManager.success_response({"user": user_data})
        
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)


def update_user_profile(event, context):
    """Updates to a user's custom profile fields."""
    try:
        parsed = LambdaManager.parse_event(event)

        user_id = parsed.get('user_id') 
        if not user_id and 'userId' in parsed['body']:
            user_id = parsed['body']['userId']
            
        if not user_id:
            return LambdaManager.error_response(f"Missing userId parameter. DEBUG EVENT: {str(event)}", 401)
            
        updates = parsed['body'].get('updates', {})
        if not updates:
            return LambdaManager.error_response("No update data provided", 400)
            
        db.update_user(user_id, updates)
        
        return LambdaManager.success_response({"message": "Profile updated successfully!"})
    except Exception as e:
        print(f"Error in update_user_profile: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)
