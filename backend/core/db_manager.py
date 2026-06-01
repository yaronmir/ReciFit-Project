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

    def save_recipe(self, user_id, recipe_id, recipe_data):
        """
        Appends a generated recipe to the SavedRecipes list in the Users table.
        """
        try:
            item = {
                'RecipeId': recipe_id,
                **recipe_data
            }
            self.table.update_item(
                Key={'UserId': user_id},
                UpdateExpression="SET SavedRecipes = list_append(if_not_exists(SavedRecipes, :empty_list), :new_recipe)",
                ExpressionAttributeValues={
                    ':new_recipe': [item],
                    ':empty_list': []
                }
            )
            return True
        except ClientError as e:
            error_message = e.response['Error']['Message']
            print(f"Error saving recipe {recipe_id} for user {user_id}: {error_message}")
            raise Exception(f"Database write error: {error_message}")

    def get_saved_recipes(self, user_id):
        """
        Fetches all saved recipes from the user's profile.
        """
        try:
            response = self.table.get_item(Key={'UserId': user_id}, ProjectionExpression="SavedRecipes")
            return response.get('Item', {}).get('SavedRecipes', [])
        except ClientError as e:
            error_message = e.response['Error']['Message']
            print(f"Error fetching recipes for user {user_id}: {error_message}")
            raise Exception(f"Database read error: {error_message}")

    def save_chat_history(self, user_id, chat_id, title, messages):
        """
        Saves or updates a chat conversation in the user's ChatHistories list.
        Instead of a complicated list update, we'll fetch, modify, and put for simplicity since histories are small.
        """
        try:
            # 1. Get current histories
            response = self.table.get_item(Key={'UserId': user_id}, ProjectionExpression="ChatHistories")
            histories = response.get('Item', {}).get('ChatHistories', [])
            
            # 2. Update or append
            import datetime
            updated_chat = {
                'ChatId': chat_id,
                'Title': title,
                'Messages': messages,
                'UpdatedAt': datetime.datetime.now().isoformat()
            }
            
            existing_idx = next((i for i, c in enumerate(histories) if c['ChatId'] == chat_id), -1)
            if existing_idx >= 0:
                histories[existing_idx] = updated_chat
            else:
                histories.append(updated_chat)
                
            # 3. Save back
            self.table.update_item(
                Key={'UserId': user_id},
                UpdateExpression="SET ChatHistories = :histories",
                ExpressionAttributeValues={':histories': histories}
            )
            return True
        except ClientError as e:
            print(f"Error saving chat history: {e}")
            raise Exception(f"Database write error: {e.response['Error']['Message']}")

    def get_chat_histories(self, user_id):
        """
        Fetches all chat histories from the user's profile.
        """
        try:
            response = self.table.get_item(Key={'UserId': user_id}, ProjectionExpression="ChatHistories")
            return response.get('Item', {}).get('ChatHistories', [])
        except ClientError as e:
            print(f"Error fetching chat histories: {e}")
            raise Exception(f"Database read error: {e.response['Error']['Message']}")

    def delete_chat_history(self, user_id, chat_id):
        """
        Deletes a specific chat history from the user's profile.
        """
        try:
            histories = self.get_chat_histories(user_id)
            new_histories = [h for h in histories if h.get('ChatId') != chat_id]
            
            if len(histories) == len(new_histories):
                return False # Nothing was deleted
                
            self.table.update_item(
                Key={'UserId': user_id},
                UpdateExpression="SET ChatHistories = :histories",
                ExpressionAttributeValues={':histories': new_histories}
            )
            return True
        except ClientError as e:
            print(f"Error deleting chat history: {e}")
            raise Exception(f"Database write error: {e.response['Error']['Message']}")
