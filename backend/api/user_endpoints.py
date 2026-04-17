import sys
import os

# Ensure the parent directory is in the Python path so we can import core modules 
# accurately when AWS Lambda dynamically loads 'api.user_endpoints'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db_manager import DbManager
from core.lambda_manager import LambdaManager

# Initialize DbManager outside the handler so AWS Lambda can reuse the connection
db = DbManager()

def get_user_profile(event, context):
    """
    AWS Lambda Handler to retrieve a user's profile.
    It expects the user_id to be provided either by the Cognito Authorizer
    or realistically via a query string for testing purposes.
    """
    try:
        # 1. Parse the incoming request
        parsed = LambdaManager.parse_event(event)
        
        # Try to get user_id from Cognito Authorizer, fallback to query string for manual testing
        user_id = parsed.get('user_id') 
        if not user_id and 'userId' in parsed['query_params']:
            user_id = parsed['query_params']['userId']
        
        if not user_id:
            return LambdaManager.error_response("Missing userId parameter or unauthorized request", 401)
            
        # 2. Get the info from DynamoDB
        user_data = db.get_user(user_id)
        
        if not user_data:
            return LambdaManager.error_response("User profile not found", 404)
            
        # 3. Return the info to the frontend
        return LambdaManager.success_response({"user": user_data})
        
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)
