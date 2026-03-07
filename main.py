from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

client = AsyncIOMotorClient("MONGO_URI")
db = client.gymate

users    = db.users
sessions = db.sessions
reps     = db.reps

class User(BaseModel):
    name: str
    email: str
    university: str
    age: str
    weight: str
    height: str

@app.post("/users")
async def create_user(user: User):
    existing = await users.find_one({"email": user.email})
    if existing:
        return {"status": "exists", "user": {**existing, "_id": str(existing["_id"])}}
    result = await users.insert_one(user.dict())
    return {"status": "created", "id": str(result.inserted_id)}

@app.get("/users/{email}")
async def get_user(email: str):
    user = await users.find_one({"email": email})
    if not user:
        return None
    return {**user, "_id": str(user["_id"])}

@app.get("/test")
async def test():
    collections = await db.list_collection_names()
    return {"status": "connected", "collections": collections}