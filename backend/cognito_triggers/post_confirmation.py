import boto3
import os
import datetime

# Initialize the DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# It's best practice to pass the table name as an Environment Variable
TABLE_NAME = os.environ.get('USERS_TABLE_NAME', 'Users')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    """
    AWS Cognito Post Confirmation Trigger
    This runs automatically right after the user signs up and verifies their email.
    """
    
    # Make sure we are only reacting to a successful sign-up confirmation
    if event['triggerSource'] == "PostConfirmation_ConfirmSignUp":
        
        # 'request' contains all the info Cognito collected during sign-up
        user_attributes = event['request']['userAttributes']
        
        # 'sub' is the unique permanent ID Cognito created for this user
        cognito_user_id = user_attributes.get('sub') 
        email = user_attributes.get('email')
        
        try:
            # Let's save them into our own DataBase (DynamoDB example)
            table.put_item(
                Item={
                    'UserId': cognito_user_id,   # This will be the Partition Key in DynamoDB
                    'Email': email,
                    'CreatedAt': datetime.datetime.utcnow().isoformat(),
                    
                    # We can set default values for brand new users here!
                    'SubscriptionPlan': 'Free',
                    'FitnessGoal': 'Not Set',
                    'CreditsForRecipes': 5  # Give them 5 free AI recipes to start
                }
            )
            print(f"Successfully created a DB profile for: {email}")
            
        except Exception as e:
            # Log the error. 
            print(f"Error saving user {email} to database: {str(e)}")
            
    # CRITICAL: You MUST return the event back to Cognito at the end!
    # If you don't return it, Cognito will think the process failed and block the user.
    return event
