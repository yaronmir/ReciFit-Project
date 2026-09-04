import sys
import os
import json
import urllib.request
import uuid
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db_manager import DbManager
from core.s3_manager import S3Manager
from core.lambda_manager import LambdaManager

db = DbManager()
s3 = S3Manager()

def call_openai_recipe(api_key, user_message, remaining_macros, chat_history=[]):
    """
    Calls OpenAI to generate a recipe fitting the user's remaining macros.
    """
    tools = [
        {
            "type": "function",
            "function": {
                "name": "generate_recipe",
                "description": "Generates a personalized recipe based on the user's request and remaining nutritional limits.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Name of the recipe"},
                        "description": {"type": "string", "description": "Brief engaging description"},
                        "ingredients": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "instructions": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "macros": {
                            "type": "object",
                            "properties": {
                                "calories": {"type": "number"},
                                "protein": {"type": "number"},
                                "carbs": {"type": "number"},
                                "fats": {"type": "number"}
                            },
                            "required": ["calories", "protein", "carbs", "fats"]
                        },
                        "bot_message": {"type": "string", "description": "A conversational response to the user."}
                    },
                    "required": ["title", "description", "ingredients", "instructions", "macros", "bot_message"]
                }
            }
        }
    ]

    system_prompt = f"""You are a professional chef and nutritionist. 
The user has the following daily macros REMAINING: 
Calories: {remaining_macros.get('calories', 0)}, Protein: {remaining_macros.get('protein', 0)}g, Carbs: {remaining_macros.get('carbs', 0)}g, Fats: {remaining_macros.get('fats', 0)}g.
Generate a recipe that is suitable for their request. 
CRITICAL: If the user does not have enough calories remaining or if the recipe exceeds their remaining macros, you MUST still provide a recipe, but you MUST note in your 'bot_message' that they will pass their macro goals for today.
CRITICAL: You must calculate the TRUE and accurate nutritional value of the recipe based on the exact ingredients you provide. Do NOT just copy the user's remaining macros.
Always use the generate_recipe function."""

    messages = [{"role": "system", "content": system_prompt}]
    
    # Append history
    for msg in chat_history[-4:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": "gpt-4.1-mini",
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto"
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "ReciFitApp/1.0"
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=45) as response:
        result = json.loads(response.read().decode("utf-8"))

    message = result["choices"][0]["message"]
    tool_calls = message.get("tool_calls")
    
    if tool_calls:
        recipe_data = json.loads(tool_calls[0]["function"]["arguments"])
        recipe_data['is_recipe'] = True
        return recipe_data
    else:
        return {
            "is_recipe": False,
            "bot_message": message.get("content", "I am here to help you find a recipe! What are you craving?")
        }

def call_openai_image(api_key, prompt):
    """
    Calls the college proxy model to generate a photorealistic image of the recipe.
    """
    payload = {
        "model": "gpt-image-1-mini",
        "prompt": f"A professional, mouth-watering food photography shot of: {prompt}. High quality.",
        "n": 1,
        "size": "1024x1024",
        "quality": "low"
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "ReciFitApp/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
        
        data_item = result["data"][0]
        if "b64_json" in data_item and data_item["b64_json"]:
            return "data:image/png;base64," + data_item["b64_json"]
        elif "url" in data_item:
            return data_item["url"]
        else:
            raise Exception("No image URL or Base64 returned from API.")
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"HTTP {e.code}: {error_body}")

def chat_recipe(event, context):
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return LambdaManager.error_response("OpenAI API key not configured", 500)

        parsed = LambdaManager.parse_event(event)
        body = parsed.get('body', {})
        
        user_message = body.get('message')
        remaining_macros = body.get('remaining_macros', {})
        chat_history = body.get('history', [])

        if not user_message:
            return LambdaManager.error_response("Message is required", 400)

        # Generate recipe text
        recipe_data = call_openai_recipe(api_key, user_message, remaining_macros, chat_history)
        
        if recipe_data.get('is_recipe'):
            # DEFERRED IMAGE GENERATION: We no longer generate images during the chat!
            # We only generate the image when the user clicks 'Save to Cookbook' to save API costs.
            recipe_data['image_url'] = None
        else:
            recipe_data['image_url'] = None

        return LambdaManager.success_response(recipe_data)

    except Exception as e:
        print(f"Error in chat_recipe: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)

def save_recipe(event, context):
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return LambdaManager.error_response("OpenAI API key not configured", 500)

        parsed = LambdaManager.parse_event(event)
        user_id = parsed.get('user_id') or parsed.get('body', {}).get('userId')
        
        if not user_id:
            return LambdaManager.error_response("Unauthorized", 401)

        body = parsed.get('body', {})
        recipe_data = body.get('recipe')
        image_url = body.get('image_url') or recipe_data.get('image_url')
        
        if not recipe_data or not recipe_data.get('title'):
            return LambdaManager.error_response("Valid recipe data is required", 400)

        recipe_id = str(uuid.uuid4())
        
        # 1. Deferred Image Generation & Upload to S3
        s3_image_key = f"recipes/{user_id}/{recipe_id}.png"
        presigned_image_url = None
        
        try:
            recipe_title = recipe_data.get('title', 'A delicious meal')
            print(f"Generating image for saved recipe: {recipe_title}")
            
            # Generate the image ONLY when saving!
            generated_image_url = call_openai_image(api_key, recipe_title)
            
            if generated_image_url and generated_image_url.startswith("data:image"):
                # Extract the base64 part
                base64_data = generated_image_url.split(",")[1]
                s3.upload_image_from_base64(base64_data, s3_image_key)
            else:
                s3.upload_image_from_url(generated_image_url, s3_image_key)
                
        except Exception as e:
            print(f"Error generating or uploading image to S3: {e}")
            s3_image_key = None

        # 2. Upload Recipe JSON to S3 (per user request)
        s3_json_key = f"recipes/{user_id}/{recipe_id}.json"
        s3.upload_json(recipe_data, s3_json_key)
        
        # Save to DynamoDB
        recipe_record = {
            'Title': recipe_data['title'],
            'Description': recipe_data.get('description', ''),
            'Ingredients': recipe_data.get('ingredients', []),
            'Instructions': recipe_data.get('instructions', []),
            'Macros': recipe_data.get('macros', {}),
            'S3ImageKey': s3_image_key,
            'S3JsonKey': s3_json_key,
            'CreatedAt': str(uuid.uuid1())
        }
        
        recipe_record_dec = json.loads(json.dumps(recipe_record), parse_float=Decimal)
        db.save_recipe(user_id, recipe_id, recipe_record_dec)

        presigned_image_url = s3.get_presigned_url(s3_image_key) if s3_image_key else None
        
        return LambdaManager.success_response({
            "message": "Recipe and image saved successfully to S3 and DynamoDB!",
            "recipe_id": recipe_id,
            "image_url": presigned_image_url
        })

    except Exception as e:
        print(f"Error in save_recipe: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)

def get_cookbook(event, context):
    try:
        parsed = LambdaManager.parse_event(event)
        user_id = parsed.get('user_id') or parsed.get('query_params', {}).get('userId')
        
        if not user_id:
            return LambdaManager.error_response("Unauthorized", 401)

        recipes = db.get_saved_recipes(user_id)
        
        for recipe in recipes:
            if recipe.get('S3ImageKey'):
                try:
                    recipe['ImageUrl'] = s3.get_presigned_url(recipe['S3ImageKey'])
                except Exception as e:
                    recipe['ImageUrl'] = None

        return LambdaManager.success_response({"recipes": recipes})

    except Exception as e:
        print(f"Error in get_cookbook: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)

def save_chat_history_endpoint(event, context):
    try:
        parsed = LambdaManager.parse_event(event)
        user_id = parsed.get('user_id') or parsed.get('body', {}).get('userId')
        
        if not user_id:
            return LambdaManager.error_response("Unauthorized", 401)

        body = parsed.get('body', {})
        chat_id = body.get('chat_id')
        title = body.get('title', 'New Chat')
        messages = body.get('messages', [])
        
        if not chat_id:
            chat_id = str(uuid.uuid4())
            
        # Prevent DynamoDB 400KB limit crash by stripping massive Base64 images from the chat history log
        for msg in messages:
            if msg.get('recipe') and 'image_url' in msg['recipe']:
                msg['recipe']['image_url'] = None
                
        # Convert float to decimal for dynamodb if any macros exist
        messages_dec = json.loads(json.dumps(messages), parse_float=Decimal)

        db.save_chat_history(user_id, chat_id, title, messages_dec)

        return LambdaManager.success_response({
            "message": "Chat history saved.",
            "chat_id": chat_id
        })

    except Exception as e:
        print(f"Error in save_chat_history_endpoint: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)

def get_chat_histories_endpoint(event, context):
    try:
        parsed = LambdaManager.parse_event(event)
        user_id = parsed.get('user_id') or parsed.get('query_params', {}).get('userId')
        
        if not user_id:
            return LambdaManager.error_response("Unauthorized", 401)

        histories = db.get_chat_histories(user_id)

        return LambdaManager.success_response({"histories": histories})

    except Exception as e:
        print(f"Failed to fetch chat histories: {e}")
        return LambdaManager.error_response(str(e), 500)

def delete_chat_history_endpoint(event, context):
    """
    Deletes a specific chat history.
    """
    req_data = LambdaManager.parse_event(event)
    body = req_data['body']
    
    user_id = body.get('userId') or req_data['user_id']
    chat_id = body.get('chat_id')
    
    if not user_id or not chat_id:
        return LambdaManager.error_response("userId and chat_id are required", 400)
        
    try:
        deleted = db.delete_chat_history(user_id, chat_id)
        if deleted:
            return LambdaManager.success_response({"message": "Chat deleted successfully"})
        else:
            return LambdaManager.error_response("Chat not found", 404)
    except Exception as e:
        print(f"Failed to delete chat history: {e}")
        return LambdaManager.error_response(str(e), 500)

def delete_recipe_endpoint(event, context):
    """
    Deletes a specific recipe from the cookbook.
    """
    try:
        parsed = LambdaManager.parse_event(event)
        user_id = parsed.get('user_id') or parsed.get('body', {}).get('userId')
        recipe_id = parsed.get('body', {}).get('recipeId')
        
        if not user_id or not recipe_id:
            return LambdaManager.error_response("userId and recipeId are required", 400)

        deleted = db.delete_recipe(user_id, recipe_id)
        if deleted:
            return LambdaManager.success_response({"message": "Recipe deleted successfully"})
        else:
            return LambdaManager.error_response("Recipe not found", 404)

    except Exception as e:
        print(f"Error in delete_recipe_endpoint: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)
