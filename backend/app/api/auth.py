from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_database
from app.schemas.auth import AuthTokenResponse, LoginRequest, RegisterRequest, UserProfile


router = APIRouter(prefix="/auth", tags=["auth"])


def _user_to_profile(document: dict) -> UserProfile:
    return UserProfile(
        id=str(document["_id"]),
        full_name=document["full_name"],
        email=document["email"],
        created_at=document["created_at"],
    )


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> AuthTokenResponse:
    db = get_database()
    email = payload.email.lower()

    existing_user = await db.users.find_one({"email": email})
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    now = datetime.now(timezone.utc)
    user_document = {
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "created_at": now,
        "updated_at": now,
    }
    insert_result = await db.users.insert_one(user_document)
    user_document["_id"] = insert_result.inserted_id

    access_token = create_access_token(str(insert_result.inserted_id))
    return AuthTokenResponse(access_token=access_token, user=_user_to_profile(user_document))


@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: LoginRequest) -> AuthTokenResponse:
    db = get_database()
    user = await db.users.find_one({"email": payload.email.lower()})

    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    access_token = create_access_token(str(user["_id"]))
    return AuthTokenResponse(access_token=access_token, user=_user_to_profile(user))

