import sys
import os
import json
import urllib.request
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db_manager import DbManager
from core.lambda_manager import LambdaManager

db = DbManager()


def call_openai(api_key, food_description):
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
                    "required": ["items", "total_calories", "total_protein", "total_carbs", "total_fats", "friendly_message"]
                }
            }
        }
    ]

    payload = {
        "model": "gpt-4.1-mini",
        "messages": [
            {
                "role": "system",
                "content": "You are a professional nutritionist. When given a food description, call the record_nutrition function with accurate nutritional data."
            },
            {
                "role": "user",
                "content": f"I just ate: {food_description}"
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
        if not food_description:
            return LambdaManager.error_response("No food description provided", 400)

        nutrition_data = call_openai(api_key, food_description)

        # Save to DynamoDB (must use Decimal, not float)
        db.update_user(user_id, {
            "DailyCalories": Decimal(str(nutrition_data["total_calories"])),
            "DailyProtein":  Decimal(str(nutrition_data["total_protein"])),
            "DailyCarbs":    Decimal(str(nutrition_data["total_carbs"])),
            "DailyFats":     Decimal(str(nutrition_data["total_fats"])),
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
