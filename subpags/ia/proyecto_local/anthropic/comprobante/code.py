import os

from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()
client = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

message = client.messages.create(
    model="claude-sonnet-4-0",
    max_tokens=100,
    messages=[
        {
            "role": "user",
            "content": "Hola"
        }
    ]
)

print(message.content[0].text)