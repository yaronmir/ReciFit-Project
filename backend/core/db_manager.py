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
