import os
import jwt
import uuid
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Initialize Supabase client only if URL and key are provided
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    print("⚠️  Supabase not configured - missing URL or SERVICE_KEY in environment")

# Security scheme
security = HTTPBearer(auto_error=False)

class User:
    def __init__(self, user_id: str, email: str, user_metadata: dict = None):
        # Convert string UUID to UUID object for database compatibility
        self.id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        self.email = email
        self.user_metadata = user_metadata or {}

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """
    Extract and validate user from Supabase JWT token
    """
    if not credentials:
        return None
    
    try:
        # Get the JWT token
        token = credentials.credentials
        
        # If we have a JWT secret, verify the token locally
        if SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    token, 
                    SUPABASE_JWT_SECRET, 
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                
                user_id = payload.get("sub")
                email = payload.get("email")
                user_metadata = payload.get("user_metadata", {})
                
                if user_id and email:
                    return User(user_id=user_id, email=email, user_metadata=user_metadata)
                    
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token has expired")
            except jwt.InvalidTokenError:
                pass  # Fall through to Supabase verification
        
        # Fall back to Supabase verification
        try:
            # Use Supabase client to verify the token
            response = supabase.auth.get_user(token)
            if response.user:
                return User(
                    user_id=response.user.id,
                    email=response.user.email,
                    user_metadata=response.user.user_metadata or {}
                )
        except Exception as e:
            print(f"Supabase auth error: {e}")
            raise HTTPException(status_code=401, detail="Invalid authentication token")
            
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_current_user_required(user: User = Depends(get_current_user)) -> User:
    """
    Require authentication - raises 401 if no valid user
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def get_current_user_optional(user: Optional[User] = Depends(get_current_user)) -> Optional[User]:
    """
    Optional authentication - returns None if no valid user
    """
    return user

def get_user_id_from_token(token: str) -> Optional[uuid.UUID]:
    """
    Extract user ID from JWT token without full validation
    Used for database operations where we need the user ID as UUID
    """
    try:
        # Decode without verification for user ID extraction
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        user_id_str = unverified_payload.get("sub")
        return uuid.UUID(user_id_str) if user_id_str else None
    except:
        return None 