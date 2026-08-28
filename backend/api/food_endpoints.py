import sys
import os
import json
import urllib.request
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db_manager import DbManager
from core.lambda_manager import LambdaManager

db = DbManager()


def call_openai(api_key, food_description, image_base64=None):
    """
    Calls the OpenAI API directly using urllib (no SDK, no pydantic dependency).
    Uses Function Calling to guarantee structured JSON output.
    """
    tools = [
        {
            "type": "function",
            "function": {
                "name": "record_nutrition",
                "description": "Records the nutritional information for a described meal or food item.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reasoning": {
                            "type": "string",
                            "description": "Step-by-step reasoning. Observe the food or label, state the net weight (estimated if not written), note any 'per 100g' values, and show the explicit math scaling it to the actual net weight."
                        },
                        "items": {
                            "type": "array",
                            "description": "List of individual food items",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "food":     {"type": "string"},
                                    "amount":   {"type": "string"},
                                    "calories": {"type": "number"},
                                    "protein":  {"type": "number"},
                                    "carbs":    {"type": "number"},
                                    "fats":     {"type": "number"}
                                },
                                "required": ["food", "amount", "calories", "protein", "carbs", "fats"]
                            }
                        },
                        "total_calories": {"type": "number"},
                        "total_protein":  {"type": "number"},
                        "total_carbs":    {"type": "number"},
                        "total_fats":     {"type": "number"},
                        "friendly_message": {"type": "string"}
                    },
                    "required": ["reasoning", "items", "total_calories", "total_protein", "total_carbs", "total_fats", "friendly_message"]
                }
            }
        }
    ]

    if image_base64:
        content = [
            {"type": "text", "text": f"I just ate: {food_description}" if food_description else "I just ate what's in this image."},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{image_base64}"
                }
            }
        ]
    else:
        content = f"I just ate: {food_description}"

    payload = {
        "model": "gpt-4.1-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional nutritionist and food analyst. "
                    "When given a food description or an image, accurately determine its nutritional values. "
                    "CRITICAL RULES FOR IMAGES: "
                    "1. If it's a packaged food, look for the net weight (e.g., 41.5g, 45g) and the nutritional info on the wrapper. "
                    "2. Often, nutrition on packages is listed 'per 100g'. You MUST scale these values to the actual net weight of the item (e.g. if 535 kcal per 100g and the bar is 45g, total calories = 535 * 0.45). "
                    "3. If the net weight is not perfectly visible, mathematically estimate the standard serving size for that specific brand/item. "
                    "4. Always return the TOTAL nutritional value for the portion eaten or shown."
                )
            },
            {
                "role": "user",
                "content": content
            }
        ],
        "tools": tools,
        "tool_choice": {"type": "function", "function": {"name": "record_nutrition"}}
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8"))

    tool_call = result["choices"][0]["message"]["tool_calls"][0]
    return json.loads(tool_call["function"]["arguments"])


def log_food(event, context):
    """
    Receives a natural-language food description,
    calls OpenAI to extract nutrition data, saves to DynamoDB.
    """
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return LambdaManager.error_response("OpenAI API key not configured", 500)

        parsed = LambdaManager.parse_event(event)

        user_id = parsed.get('user_id')
        if not user_id and 'userId' in parsed['body']:
            user_id = parsed['body']['userId']

        if not user_id:
            return LambdaManager.error_response("Missing userId parameter", 401)

        food_description = parsed['body'].get('foodDescription', '')
        image_base64 = parsed['body'].get('imageBase64', None)
        
        if not food_description and not image_base64:
            return LambdaManager.error_response("No food description or image provided", 400)

        nutrition_data = call_openai(api_key, food_description, image_base64)

        # Get current daily totals from DB so we can ADD to them (not replace)
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        current_user = db.get_user(user_id) or {}
        last_log_date = current_user.get("LastLogDate", "")

        # If it's a new day, start fresh from 0 (daily reset)
        if last_log_date == today:
            current_calories = float(current_user.get("DailyCalories", 0) or 0)
            current_protein  = float(current_user.get("DailyProtein",  0) or 0)
            current_carbs    = float(current_user.get("DailyCarbs",    0) or 0)
            current_fats     = float(current_user.get("DailyFats",     0) or 0)
        else:
            # New day — reset to 0 before adding today's food
            current_calories = 0
            current_protein  = 0
            current_carbs    = 0
            current_fats     = 0

        new_calories = current_calories + nutrition_data["total_calories"]
        new_protein  = current_protein  + nutrition_data["total_protein"]
        new_carbs    = current_carbs    + nutrition_data["total_carbs"]
        new_fats     = current_fats     + nutrition_data["total_fats"]

        # Save updated totals to DynamoDB (must use Decimal, not float)
        db.update_user(user_id, {
            "DailyCalories": Decimal(str(round(new_calories, 1))),
            "DailyProtein":  Decimal(str(round(new_protein,  1))),
            "DailyCarbs":    Decimal(str(round(new_carbs,    1))),
            "DailyFats":     Decimal(str(round(new_fats,     1))),
            "LastLogDate":   today,
        })

        return LambdaManager.success_response({
            "message": nutrition_data["friendly_message"],
            "items": nutrition_data["items"],
            "totals": {
                "calories": nutrition_data["total_calories"],
                "protein":  nutrition_data["total_protein"],
                "carbs":    nutrition_data["total_carbs"],
                "fats":     nutrition_data["total_fats"]
            }
        })

    except Exception as e:
        print(f"Error in log_food: {e}")
        return LambdaManager.error_response(f"Internal Server Error: {str(e)}", 500)
