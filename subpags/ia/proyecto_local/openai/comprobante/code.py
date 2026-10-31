import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

response = client.chat.completions.create(
    model="gpt-6-luna",
    messages=[
        {
            "role": "user",
            "content": "Hola"
        }
    ]
)

print(response.choices[0].message.content)