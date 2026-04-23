import os
import boto3
from botocore.exceptions import ClientError

class DbManager:
    """
    Manages all interactions with the DynamoDB database.
    """
    def __init__(self, table_name=None):
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = table_name or os.environ.get('USERS_TABLE_NAME', 'Users')
        self.table = self.dynamodb.Table(self.table_name)
    
    def get_user(self, user_id):
        """
        Fetches a user profile by their UserId.
        Returns a dictionary with the user data, or None if not found.
        """
        try:
            response = self.table.get_item(Key={'UserId': user_id})
            return response.get('Item')
        except ClientError as e:
            error_message = e.response['Error']['Message']
            print(f"Error fetching user {user_id}: {error_message}")
            raise Exception(f"Database read error: {error_message}")

    def update_user(self, user_id, updates):
        """
        Safely updates specific fields for a user in DynamoDB.
        updates is a dictionary of fields to update (e.g. {'Weight': 75, 'Age': 28})
        """
        try:
            update_expression = "SET "
            expression_attribute_values = {}
            expression_attribute_names = {}
            
            for key, value in updates.items():
                # Use expression attribute names to avoid AWS reserved word conflicts (like 'Age')
                update_expression += f"#{key} = :{key}, "
                expression_attribute_names[f"#{key}"] = key
                expression_attribute_values[f":{key}"] = value
                
            # Remove the trailing comma and space
            update_expression = update_expression[:-2]
            
            self.table.update_item(
                Key={'UserId': user_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            return True
        except ClientError as e:
            error_message = e.response['Error']['Message']
            print(f"Error updating user {user_id}: {error_message}")
            raise Exception(f"Database update error: {error_message}")
