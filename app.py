from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')

# System prompt for travel assistance
SYSTEM_PROMPT = """You are a helpful AI travel assistant that specializes in creating packing lists and providing travel advice. 
Your expertise includes:
- Creating detailed packing lists based on destination and activities
- Providing weather-appropriate clothing suggestions
- Recommending essential items for specific activities
- Offering travel tips and destination information

When creating packing lists:
1. Consider the destination's climate
2. Account for planned activities
3. Include essential travel documents
4. Suggest both general and specific items
5. Organize items by category

Keep responses friendly, detailed, and focused on travel-related topics."""

@app.route('/')
def serve_landing():
    return send_from_directory('.', 'landing.html')

@app.route('/chat')
def serve_chat():
    return send_from_directory('.', 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')

        # Create chat context with system prompt
        chat = model.start_chat(history=[])
        
        # Generate response
        response = chat.send_message(f"{SYSTEM_PROMPT}\n\nUser: {user_message}")
        
        return jsonify({
            "success": True,
            "response": response.text
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)
