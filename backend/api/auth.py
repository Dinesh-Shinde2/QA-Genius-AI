import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from dotenv import load_dotenv

from backend.database import db
from backend.models.schemas import UserRegister, UserLogin, Token, UserRole

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-qa-genius-ai-development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours for development convenience

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form-compatibility")

router = APIRouter(prefix="/api/auth", tags=["auth"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("id")
        role: str = payload.get("role")
        name: str = payload.get("name")
        if email is None or user_id is None:
            raise credentials_exception
        return {"id": user_id, "email": email, "role": role, "name": name}
    except JWTError:
        raise credentials_exception

@router.post("/register", response_model=dict)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing = await db.fetchrow("SELECT id FROM users WHERE email = $1", user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = get_password_hash(user_data.password)
    
    # Save user to DB
    user_id = await db.fetchval(
        """
        INSERT INTO users (email, name, password_hash, role)
        VALUES ($1, $2, $3, $4::user_role)
        RETURNING id
        """,
        user_data.email,
        user_data.name,
        hashed_pwd,
        user_data.role.value
    )
    
    return {"success": True, "user_id": str(user_id), "message": "User registered successfully"}

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.fetchrow(
        "SELECT id, email, name, password_hash, role FROM users WHERE email = $1",
        credentials.email
    )
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = {
        "sub": user["email"],
        "id": str(user["id"]),
        "name": user["name"],
        "role": user["role"]
    }
    
    access_token = create_access_token(data=user_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

# Compatibility endpoint for OAuth2PasswordRequestForm standard (Swagger UI login support)
@router.post("/login-form-compatibility")
async def login_form_compatibility(form_data: OAuth2PasswordBearer = Depends(OAuth2PasswordBearer)):
    # This is a dummy compatibility endpoint just for Swagger, but standard login uses JSON /login above.
    pass
