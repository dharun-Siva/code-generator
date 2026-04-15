import requests

url = "http://localhost:8000/signup"
data = {
    "email": "testuser@example.com",
    "password": "testpassword",
    "role": "user"
}

response = requests.post(url, json=data)
print("Status Code:", response.status_code)
print("Response JSON:", response.json())
