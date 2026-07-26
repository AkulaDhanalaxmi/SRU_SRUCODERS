from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

import os
import sys
import io
import re
import json
import uuid
import random
import base64
import hashlib
import mimetypes
import logging
import asyncio
import shutil
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

PARENT_DIR = ROOT_DIR.parent
if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

import jwt
import bcrypt
import qrcode

try:
    import openai
except ImportError:
    openai = None

try:
    import requests
except ImportError:
    requests = None

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from backend.seed import seed_db, hash_pw
    from backend.utils.packguard_verifier import run_packguard_ai
    from backend.utils.vision_client import compare_product_images, VisionProviderNotConfiguredError
    from backend.utils.vton_client_lightx import generate_virtual_tryon, VTONError
except ImportError:
    try:
        from seed import seed_db, hash_pw
        from utils.packguard_verifier import run_packguard_ai
        from utils.vision_client import compare_product_images, VisionProviderNotConfiguredError
        from utils.vton_client_lightx import generate_virtual_tryon, VTONError
    except ImportError:
        from .seed import seed_db, hash_pw
        from .utils.packguard_verifier import run_packguard_ai
        from .utils.vision_client import compare_product_images, VisionProviderNotConfiguredError
        from .utils.vton_client_lightx import generate_virtual_tryon, VTONError

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')

if not MONGO_URL:
    logger.error("MONGO_URL not configured. Please set MONGO_URL in backend/.env to your MongoDB Atlas URI.")
    raise SystemExit("MONGO_URL not configured")

if not DB_NAME:
    logger.error("DB_NAME not configured. Please set DB_NAME in backend/.env to your database name.")
    raise SystemExit("DB_NAME not configured")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-image-1')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if OPENAI_API_KEY and openai is not None:
    openai.api_key = OPENAI_API_KEY
elif OPENAI_API_KEY and openai is None:
    logger.warning("OPENAI_API_KEY is configured but openai package is not installed. AI editing disabled.")
else:
    logger.info("OPENAI_API_KEY not configured: AI image editing will use fallback placeholder")


# ---------- auth helpers ----------
def verify_pw(plain, hashed):
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id, remember=False):
    exp = datetime.now(timezone.utc) + (timedelta(days=30) if remember else timedelta(days=1))
    return jwt.encode({"sub": user_id, "exp": exp, "type": "access"}, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def public_user(u):
    u = dict(u)
    u.pop("password_hash", None)
    u.setdefault("role", "customer")
    return u


def normalize_role(role_hint: Optional[str] = None):
    value = (role_hint or "").strip().lower()
    if value in {"operator", "warehouse", "warehouse_operator", "ops", "admin"}:
        return "operator"
    if value in {"manager", "warehouse_manager"}:
        return "manager"
    return "customer"


def _classify_ops_order_state(order: dict) -> str:
    packguard = order.get("packguard") or {}
    raw_status = (packguard.get("final_status") or packguard.get("status") or order.get("status") or "pending")
    label = str(raw_status).strip().lower()
    if label in {"ai_verified", "verified", "packed", "approved", "complete"}:
        return "verified"
    if label in {"mismatch", "rejected", "verification_failed", "dispatch_blocked", "manual_review", "declined", "blocked"}:
        return "rejected"
    return "pending"


def _serialize_ops_order(order: dict, user_lookup: dict, product_lookup: dict):
    items = order.get("items") or []
    primary_item = items[0] if items else {}
    address = order.get("address") or {}
    user = user_lookup.get(order.get("user_id")) or {}
    primary_product = product_lookup.get(primary_item.get("product_id")) or {}
    address_parts = [address.get("line1"), address.get("city"), address.get("state"), address.get("pin")]
    delivery_address = ", ".join([part for part in address_parts if part])
    items_summary = []
    total_quantity = 0
    for item in items:
        product = product_lookup.get(item.get("product_id")) or {}
        item_qty = item.get("qty", 1)
        total_quantity += item_qty
        items_summary.append({
            "product_id": item.get("product_id"),
            "name": item.get("name") or product.get("name"),
            "brand": item.get("brand") or product.get("brand"),
            "color": item.get("color") or item.get("colour") or product.get("color") or product.get("colour"),
            "size": item.get("size"),
            "qty": item_qty,
            "image": item.get("image") or product.get("image") or product.get("image_url"),
            "category": item.get("category") or product.get("category"),
        })
    return {
        "id": order["id"],
        "user_id": order.get("user_id"),
        "product_id": primary_item.get("product_id"),
        "status": order.get("status"),
        "customer_name": user.get("name"),
        "customer_phone": user.get("phone"),
        "delivery_address": delivery_address or "Address not provided",
        "product_image": primary_item.get("image") or primary_product.get("image") or primary_product.get("image_url"),
        "product_name": primary_item.get("name") or primary_product.get("name"),
        "brand": primary_item.get("brand") or primary_product.get("brand"),
        "product_brand": primary_item.get("brand") or primary_product.get("brand"),
        "product_color": primary_item.get("color") or primary_item.get("colour") or primary_product.get("color") or primary_product.get("colour"),
        "product_size": primary_item.get("size"),
        "product_price": primary_item.get("price") or order.get("total") or 0,
        "product_quantity": primary_item.get("qty", 1),
        "product_category": primary_product.get("category") or primary_item.get("category"),
        "ordered_size": primary_item.get("size"),
        "ordered_color": primary_item.get("color") or primary_item.get("colour") or primary_product.get("color") or primary_product.get("colour"),
        "ordered_at": order.get("ordered_at") or order.get("created_at"),
        "order_date": order.get("ordered_at") or order.get("created_at"),
        "quantity": total_quantity or primary_item.get("qty", 1),
        "warehouse_name": primary_item.get("warehouse") or order.get("warehouse_name") or "Unassigned",
        "warehouse_location": order.get("warehouse_location") or address.get("city") or address.get("state") or "Not specified",
        "dispatch_status": "Packed" if order.get("status") == "packed" else (order.get("status") or "Packed"),
        "item": primary_item.get("name"),
        "items_summary": items_summary,
        "items_count": len(items_summary),
        "packguard": order.get("packguard"),
        "dispatch_blocked": order.get("dispatch_blocked", False),
    }


def _ensure_upload_folder(subfolder: str):
    folder = ROOT_DIR / "uploads" / subfolder
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def generate_qr_code(order_id: str, verification_id: str):
    payload = {
        "verificationId": verification_id,
        "orderId": order_id,
    }
    qr_dir = _ensure_upload_folder("qrcodes")
    filename = f"{verification_id}.png"
    qr_path = qr_dir / filename
    img = qrcode.make(json.dumps(payload))
    img.save(qr_path)
    return f"/uploads/qrcodes/{filename}"


def _normalize_text(value):
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _string_score(expected, observed):
    if not expected and not observed:
        return 0
    exp = _normalize_text(expected)
    obs = _normalize_text(observed)
    if not exp or not obs:
        return 70 if exp or obs else 0
    if exp == obs:
        return 100
    if obs in exp or exp in obs:
        return 82
    return 58


def build_packguard_result(order, body):
    primary = (order.get("items") or [{}])[0]
    expected_brand = primary.get("brand") or ""
    expected_name = primary.get("name") or ""
    observed_brand = body.observed_brand or expected_brand
    observed_color = body.observed_color or "black"
    observed_pattern = body.observed_pattern or "solid"
    brand_score = _string_score(expected_brand, observed_brand)
    color_score = _string_score(expected_name, observed_color)
    pattern_score = _string_score(expected_name, observed_pattern)
    overall = round((brand_score + color_score + pattern_score) / 3, 1)
    confidence = round(min(99.0, max(55.0, overall + 6)), 1)
    final_status = "AI_VERIFIED" if overall >= 80 else "MISMATCH"
    mismatch_reasons = []
    if brand_score < 80:
        mismatch_reasons.append("brand")
    if color_score < 80:
        mismatch_reasons.append("color")
    if pattern_score < 80:
        mismatch_reasons.append("pattern")
    return {
        "product_match": overall,
        "confidence": confidence,
        "final_status": final_status,
        "mismatch_reasons": mismatch_reasons,
        "scanned_sku": body.scanned_sku or None,
        "notes": body.notes or None,
    }


def build_trust_recovery_result(order, body):
    primary = (order.get("items") or [{}])[0]
    expected_brand = primary.get("brand") or ""
    observed_brand = body.observed_brand or expected_brand
    observed_color = body.observed_color or "black"
    brand_score = _string_score(expected_brand, observed_brand)
    color_score = _string_score(expected_brand, observed_color)
    overall = round((brand_score + color_score) / 2, 1)
    if body.damage_reported:
        overall = max(12.0, overall - 10)
    confidence = round(min(99.0, max(20.0, overall + 10)), 1)
    match_level = "high" if overall >= 72 and confidence >= 70 else "low"
    if match_level == "high":
        final_decision = "APPROVE_REPLACEMENT" if body.damage_reported else "APPROVE_REFUND"
    else:
        final_decision = "MANUAL_REVIEW"
    recommendation = "replacement" if final_decision == "APPROVE_REPLACEMENT" else "refund" if final_decision == "APPROVE_REFUND" else "manual_review"
    return {
        "product_match": overall,
        "confidence": confidence,
        "brand_match": brand_score >= 80,
        "color_match": color_score >= 80,
        "visible_damage": bool(body.damage_reported),
        "match_level": match_level,
        "final_decision": final_decision,
        "recommendation": recommendation,
        "dispute_reason": body.dispute_reason or None,
        "notes": body.notes or None,
    }


def _build_return_product_context(order):
    primary = (order.get("items") or [{}])[0]
    catalog_image_url = order.get("packguard", {}).get("catalog_image_url") or primary.get("image") or primary.get("image_url")
    product_context = {
        "id": primary.get("product_id"),
        "name": primary.get("name"),
        "brand": primary.get("brand"),
        "sku": primary.get("sku"),
        "image": catalog_image_url,
        "image_url": catalog_image_url,
        "images": [catalog_image_url] if catalog_image_url else [],
        "color": primary.get("color") or primary.get("colour"),
        "category": primary.get("category"),
    }
    return product_context


def _create_data_url_image(uploaded_bytes: bytes, content_type: str):
    if not content_type or not content_type.startswith("image/"):
        content_type = "image/jpeg"
    return f"data:{content_type};base64,{base64.b64encode(uploaded_bytes).decode('utf-8')}"


# ---------- models ----------
class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str
    remember: bool = False
    role_hint: Optional[str] = None


class ForgotIn(BaseModel):
    email: str


class FitProfileIn(BaseModel):
    name: str
    height_cm: int
    weight_kg: int
    body_shape: str
    preferred_fit: str
    clothing_size: Optional[str] = None
    language: str = "en"


class AddressIn(BaseModel):
    label: str
    receiver: str
    phone: str
    line1: str
    city: str
    state: str
    pin: str


class CartItemIn(BaseModel):
    product_id: str
    size: Optional[str] = None
    color: Optional[str] = None
    qty: int = 1


class EvaluateIn(BaseModel):
    product_id: str
    fit_profile_id: Optional[str] = None
    address_id: Optional[str] = None
    purpose: Optional[str] = None
    event_date: Optional[str] = None
    payment_method: Optional[str] = "card"
    selected_size: Optional[str] = None


class OrderIn(BaseModel):
    items: List[CartItemIn]
    address_id: str
    payment_method: str
    delivery_type: str = "standard"
    coupon: Optional[str] = None
    purpose: Optional[str] = None
    event_date: Optional[str] = None
    delivery_preference: Optional[str] = "normal"
    preferred_delivery_date: Optional[str] = None
    gift_wrap: bool = False
    gift_message: Optional[str] = None


class FeedbackIn(BaseModel):
    fit: str


class OpsVerifyIn(BaseModel):
    scanned_sku: Optional[str] = None
    warehouse_image_data_url: Optional[str] = None
    observed_brand: Optional[str] = None
    observed_color: Optional[str] = None
    observed_pattern: Optional[str] = None
    notes: Optional[str] = None


class TrustReviewIn(BaseModel):
    dispute_reason: Optional[str] = None
    observed_brand: Optional[str] = None
    observed_color: Optional[str] = None
    damage_reported: bool = False
    notes: Optional[str] = None


class OpsResolveIn(BaseModel):
    decision: str


# ---------- auth routes ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    user = {
        "id": str(uuid.uuid4()), "name": body.name, "email": email,
        "password_hash": hash_pw(body.password), "phone": "",
        "addresses": [], "fit_profiles": [], "active_fit_profile": None,
        "wishlist": [], "cart": [], "language": "en", "fit_profile_done": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    user.pop("_id", None)
    return {"token": create_token(user["id"]), "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn):
    logger.info("[LOGIN] start login for email=%s", body.email)
    email = body.email.lower().strip()
    logger.info("[LOGIN] normalized email=%s", email)
    user = await db.users.find_one({"email": email}, {"_id": 0})
    logger.info("[LOGIN] user found=%s", bool(user))
    if not user:
        logger.info("[LOGIN] no user record")
        raise HTTPException(401, "Invalid email or password")
    logger.info("[LOGIN] verifying password for user id=%s", user["id"])
    if not verify_pw(body.password, user["password_hash"]):
        logger.info("[LOGIN] password verification failed")
        raise HTTPException(401, "Invalid email or password")
    role = normalize_role(getattr(body, "role_hint", None))
    if user.get("role") != role:
        await db.users.update_one({"id": user["id"]}, {"$set": {"role": role}})
        user["role"] = role
    logger.info("[LOGIN] password verified, issuing token")
    return {"token": create_token(user["id"], body.remember), "user": public_user(user)}


@api.post("/auth/demo")
async def demo_login():
    try:
        user = await db.users.find_one({"email": "priya@buyready.in"}, {"_id": 0})
    except Exception as exc:
        logger.exception("Demo login failed because MongoDB is unavailable")
        raise HTTPException(503, detail={"message": f"Database unavailable while authenticating demo user: {exc}", "error_code": "database_unavailable"})
    if not user:
        raise HTTPException(500, "Demo user missing")
    return {"token": create_token(user["id"], True), "user": public_user(user)}


@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn):
    user = await db.users.find_one({"email": body.email.lower().strip()})
    if user:
        logger.info(f"Password reset link for {body.email}: /reset?token=demo-token")
    return {"message": "If an account exists, a reset link has been sent to your email."}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return public_user(user)


@api.get("/ops/dashboard")
async def ops_dashboard(user=Depends(get_current_user)):
    try:
        is_ops = user.get("role") in {"operator", "manager"}
        query = {} if is_ops else {"user_id": user["id"]}
        orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        logger.info("[OPS DASHBOARD] orders query size=%s", len(orders))
        user_ids = [order.get("user_id") for order in orders if order.get("user_id")]
        user_lookup = {}
        if user_ids:
            users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "phone": 1}).to_list(1000)
            user_lookup = {u["id"]: u for u in users if u.get("id")}
        product_ids = [item.get("product_id") for order in orders for item in (order.get("items") or []) if item.get("product_id")]
        product_lookup = {}
        if product_ids:
            products = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0, "id": 1, "name": 1, "brand": 1, "color": 1, "colour": 1, "image": 1, "image_url": 1}).to_list(1000)
            product_lookup = {p["id"]: p for p in products if p.get("id")}
        pending_verification = [
            _serialize_ops_order(order, user_lookup, product_lookup)
            for order in orders
        ]
        disputes = [
            {
                "id": order["id"],
                "status": order.get("status"),
                "item": (order.get("items") or [{}])[0].get("name"),
                "trust_recovery": order.get("trust_recovery"),
            }
            for order in orders if order.get("trust_recovery", {}).get("status") in {"submitted", "manual_review", "resolved"}
        ]
        states = [_classify_ops_order_state(order) for order in orders]
        pending_count = sum(1 for state in states if state == "pending")
        verified_count = sum(1 for state in states if state == "verified")
        rejected_count = sum(1 for state in states if state == "rejected")
        pending_trust = sum(1 for order in orders if order.get("trust_recovery", {}).get("status") in {"submitted", "manual_review"})
        logger.info("[OPS DASHBOARD] counts total=%s pending=%s verified=%s rejected=%s", len(orders), pending_count, verified_count, rejected_count)
        return {
            "pending_verification": pending_verification,
            "disputes": disputes,
            "total_orders": len(orders),
            "kpis": {
                "pending_packguard": pending_count,
                "pending_trust_recovery": pending_trust,
                "verified_today": verified_count,
                "dispatch_blocked": rejected_count,
                "pending": pending_count,
                "verified": verified_count,
                "rejected": rejected_count,
            },
        }
    except Exception as exc:
        logger.exception("Ops dashboard query failed")
        raise HTTPException(503, detail={"message": f"Database unavailable while loading the ops dashboard: {exc}", "error_code": "database_unavailable"})


@api.get("/ops/orders")
async def ops_orders(user=Depends(get_current_user)):
    is_ops = user.get("role") in {"operator", "manager"}
    query = {} if is_ops else {"user_id": user["id"]}
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders


@api.post("/ops/packguard/{oid}/start")
async def ops_start_packguard(oid: str, user=Depends(get_current_user)):
    query = {} if user.get("role") in {"operator", "manager"} else {"user_id": user["id"]}
    query["id"] = oid
    order = await db.orders.find_one(query, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {"status": "in_progress", "started_at": now_iso, "stage": "packed"}
    await db.orders.update_one({"id": oid}, {"$set": {"packguard": payload, "status": "packed", "dispatch_blocked": True}})
    return {"ok": True, "packguard": payload}


@api.post("/ops/packguard/{oid}/verify")
async def ops_verify_packguard(
    oid: str,
    warehouse_image: Optional[UploadFile] = File(None),
    scanned_sku: Optional[str] = Form(None),
    warehouse_image_data_url: Optional[str] = Form(None),
    observed_brand: Optional[str] = Form(None),
    observed_color: Optional[str] = Form(None),
    observed_pattern: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    user=Depends(get_current_user),
):
    try:
        print(f"\n[PACKGUARD DEBUG] === Starting verification for order {oid} ===")
        
        query = {} if user.get("role") in {"operator", "manager"} else {"user_id": user["id"]}
        query["id"] = oid
        print(f"[PACKGUARD DEBUG] Query: {query}")
        
        try:
            order = await db.orders.find_one(query, {"_id": 0})
            print(f"[PACKGUARD DEBUG] Order found: {order is not None}")
        except Exception as exc:
            print(f"[PACKGUARD DEBUG] MongoDB error loading order: {exc}")
            logger.exception("PackGuard verification failed because MongoDB is unavailable")
            raise HTTPException(503, detail={"message": f"Database unavailable while loading order {oid}: {exc}", "error_code": "database_unavailable", "order_id": oid})
        
        if not order:
            print(f"[PACKGUARD DEBUG] Order not found: {oid}")
            raise HTTPException(404, detail={"message": f"Order {oid} was not found", "error_code": "order_not_found", "order_id": oid})

        print(f"[PACKGUARD DEBUG] Order loaded successfully")

        # Default content_type up front so it's always defined, whether the
        # warehouse image arrives as a multipart file upload or as a data URL.
        content_type = "image/jpeg"
        warehouse_image_ref = None
        uploaded_bytes = b""
        if warehouse_image is not None:
            print(f"[PACKGUARD DEBUG] Processing uploaded warehouse image: {warehouse_image.filename}")
            uploaded_bytes = await warehouse_image.read()
            print(f"[PACKGUARD DEBUG] Uploaded image size: {len(uploaded_bytes)} bytes")
            if not uploaded_bytes:
                raise HTTPException(400, detail={"message": "Uploaded warehouse image is empty", "error_code": "empty_upload", "order_id": oid})
            content_type = warehouse_image.content_type or "image/jpeg"
            if not content_type.startswith("image/"):
                raise HTTPException(400, detail={"message": "Uploaded warehouse image must be an image file", "error_code": "invalid_file_type", "order_id": oid})
            warehouse_image_ref = {"type": "dataUrl", "value": f"data:{content_type};base64,{base64.b64encode(uploaded_bytes).decode('utf-8')}"}
        elif warehouse_image_data_url:
            print(f"[PACKGUARD DEBUG] Using data URL warehouse image")
            warehouse_image_ref = {"type": "dataUrl", "value": warehouse_image_data_url}
            # Pull the content type out of the data URL itself (e.g.
            # "data:image/png;base64,...") instead of leaving it at the
            # image/jpeg default, so the saved file extension matches.
            if warehouse_image_data_url.startswith("data:") and ";base64," in warehouse_image_data_url:
                header = warehouse_image_data_url.split(";base64,", 1)[0]
                parsed_type = header[len("data:"):].strip()
                if parsed_type:
                    content_type = parsed_type
            try:
                uploaded_bytes = base64.b64decode(warehouse_image_data_url.split(",", 1)[1])
            except Exception:
                uploaded_bytes = b""

        if not warehouse_image_ref:
            raise HTTPException(400, detail={"message": "Warehouse image data is required for verification", "error_code": "missing_warehouse_image", "order_id": oid})

        print(f"[PACKGUARD DEBUG] Warehouse image ready")
        warehouse_image_hash = hashlib.sha256(uploaded_bytes).hexdigest()
        primary_item = (order.get("items") or [{}])[0]
        product_id = primary_item.get("product_id")
        print(f"[PACKGUARD DEBUG] Product ID from order: {product_id}")
        
        product_doc = None
        try:
            if product_id:
                product_doc = await db.products.find_one({"id": product_id}, {"_id": 0, "id": 1, "name": 1, "brand": 1, "image": 1, "image_url": 1, "images": 1})
                print(f"[PACKGUARD DEBUG] Product found: {product_doc is not None}")
        except Exception as exc:
            print(f"[PACKGUARD DEBUG] MongoDB error loading product: {exc}")
            logger.exception("PackGuard verification failed while reading product catalog")
            raise HTTPException(503, detail={"message": f"Database unavailable while loading product {product_id}: {exc}", "error_code": "database_unavailable", "order_id": oid, "product_id": product_id})

        catalog_image_url = primary_item.get("image") or primary_item.get("image_url") or (product_doc or {}).get("image") or (product_doc or {}).get("image_url")
        if not catalog_image_url and product_doc:
            catalog_image_url = (product_doc.get("images") or [None])[0]

        print(f"[PACKGUARD DEBUG] Catalog image URL: {catalog_image_url[:50] if catalog_image_url else 'MISSING'}...")
        
        warehouse_ext = mimetypes.guess_extension(content_type) or ".jpg"
        warehouse_filename = f"{uuid.uuid4()}{warehouse_ext}"
        warehouse_path = _ensure_upload_folder("warehouse") / warehouse_filename
        warehouse_path.write_bytes(uploaded_bytes)
        warehouse_image_url = f"/uploads/warehouse/{warehouse_filename}"
        
        if not catalog_image_url:
            raise HTTPException(400, detail={
                "message": f"Product catalog image is missing for seeded product {product_id or 'unknown'} ({(product_doc or {}).get('name') or primary_item.get('name') or 'unknown'}). Seed the product with an image_url before verifying.",
                "error_code": "missing_catalog_image",
                "order_id": oid,
                "product_id": product_id,
                "product_name": (product_doc or {}).get("name") or primary_item.get("name"),
                "brand": (product_doc or {}).get("brand") or primary_item.get("brand"),
            })

        logger.info("[PACKGUARD] verifying order=%s product_id=%s product_name=%s catalog_image_present=%s warehouse_image_bytes=%s", oid, product_id, (product_doc or {}).get("name") or primary_item.get("name"), bool(catalog_image_url), len(uploaded_bytes))

        order_context = dict(order)
        order_context["image"] = catalog_image_url
        order_context["image_url"] = catalog_image_url
        order_context["images"] = [catalog_image_url]

        scan_input = {
            "scanned_sku": scanned_sku,
            "warehouse_image": warehouse_image_ref,
            "observed_brand": observed_brand,
            "observed_color": observed_color,
            "observed_pattern": observed_pattern,
            "notes": notes,
        }

        print(f"[PACKGUARD DEBUG] Calling run_packguard_ai...")
        try:
            result = run_packguard_ai(order_context, scan_input)
            print(f"[PACKGUARD DEBUG] AI verification result: {result.get('final_status')}")
        except HTTPException:
            raise
        except Exception as exc:
            print(f"[PACKGUARD DEBUG] AI verification failed:")
            traceback.print_exc()
            logger.exception("PackGuard AI verification failed for order=%s", oid)
            raise HTTPException(500, detail={
                "message": f"PackGuard verification failed for order {oid}: {exc}",
                "error_code": "ai_verification_failed",
                "order_id": oid,
                "product_id": product_id,
                "product_name": (product_doc or {}).get("name") or primary_item.get("name"),
                "traceback": traceback.format_exc(),
            })

        print(f"[PACKGUARD DEBUG] Generating QR code metadata...")
        verification_id = str(uuid.uuid4())
        qr_url = None
        if result["final_status"] == "AI_VERIFIED":
            qr_url = generate_qr_code(order["id"], verification_id)
        payload = {
            "status": "verified" if result["final_status"] == "AI_VERIFIED" else "verification_failed",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verification_id": verification_id,
            "verification_time": datetime.now(timezone.utc).isoformat(),
            "order_id": order["id"],
            "product_id": product_id,
            "sku": primary_item.get("sku") or order.get("sku"),
            "size": primary_item.get("size"),
            "brand": primary_item.get("brand") or (product_doc or {}).get("brand") or "",
            "expected_color": primary_item.get("color") or primary_item.get("colour") or (product_doc or {}).get("color") or (product_doc or {}).get("colour") or "—",
            "expected_brand": primary_item.get("brand") or (product_doc or {}).get("brand") or "—",
            "expected_size": primary_item.get("size") or "—",
            "observed_color": observed_color or "—",
            "observed_brand": observed_brand or "—",
            "user_id": user.get("id"),
            "catalog_image_url": catalog_image_url,
            "warehouse_image_url": warehouse_image_url,
            "image_hash": warehouse_image_hash,
            "qr_code_url": qr_url,
            "dispatch_enabled": result["dispatch_enabled"],
            **result,
        }

        if payload["status"] == "verification_failed":
            payload["repack_required"] = True

        print(f"[PACKGUARD DEBUG] Saving result to database...")
        try:
            await db.orders.update_one({"id": oid}, {"$set": {"packguard": payload, "dispatch_blocked": not payload["dispatch_enabled"], "status": "packed"}})
            print(f"[PACKGUARD DEBUG] Result saved successfully")
        except Exception as exc:
            print(f"[PACKGUARD DEBUG] Database error saving result: {exc}")
            logger.exception("PackGuard verification failed while saving the result")
            raise HTTPException(503, detail={"message": f"Database unavailable while saving verification result: {exc}", "error_code": "database_unavailable", "order_id": oid})

        packed_at = datetime.now(timezone.utc).isoformat()
        timeline = order.get("timeline") or []
        if timeline:
            for t in timeline:
                if t["stage"] == "packed":
                    t["done"] = True
                    t["at"] = packed_at
        else:
            timeline = [
                {"stage": "placed", "label": STAGE_LABELS["placed"], "at": order.get("created_at") or order.get("ordered_at"), "done": True},
                {"stage": "packed", "label": STAGE_LABELS["packed"], "at": packed_at, "done": True},
                *[{"stage": s, "label": STAGE_LABELS[s], "at": None, "done": False} for s in STAGES[2:]],
            ]

        await db.orders.update_one({"id": oid}, {"$set": {
            "packguard": payload,
            "dispatch_blocked": not payload["dispatch_enabled"],
            "status": "packed",
            "timeline": timeline,
        }})

        if payload["status"] == "verified":
            await notify(order["user_id"], "Order Packed 📦", f"Your order {oid} has been packed and verified by PackGuard. Tracking is live.")
        else:
            await notify(order["user_id"], "Order On Hold ⚠️", f"Your order {oid} failed verification and is on hold for review. Our team will update you soon.")

        print(f"[PACKGUARD DEBUG] === Verification complete ===\n")
        return {"ok": True, "packguard": payload}
    
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        logger.exception("PackGuard unexpected error for order=%s", oid)
        raise


@api.post("/ops/trust-recovery/{oid}/submit")
async def ops_submit_trust_review(oid: str, body: TrustReviewIn, user=Depends(get_current_user)):
    query = {} if user.get("role") in {"operator", "manager"} else {"user_id": user["id"]}
    query["id"] = oid
    order = await db.orders.find_one(query, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    result = build_trust_recovery_result(order, body)
    payload = {"status": "submitted" if result["match_level"] == "low" else "resolved", **result}
    await db.orders.update_one({"id": oid}, {"$set": {"trust_recovery": payload}})
    return {"ok": True, "trust_recovery": payload}


@api.post("/ops/trust-recovery/{oid}/resolve")
async def ops_resolve_trust_review(oid: str, body: OpsResolveIn, user=Depends(get_current_user)):
    if user.get("role") not in {"operator", "manager"}:
        raise HTTPException(403, "Only operators can resolve disputes")
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    current = dict(order.get("trust_recovery") or {})
    current["status"] = "resolved"
    current["final_decision"] = "APPROVED" if body.decision.lower() == "approved" else "REJECTED"
    await db.orders.update_one({"id": oid}, {"$set": {"trust_recovery": current}})
    return {"ok": True, "trust_recovery": current}


# ---------- products ----------
@api.get("/products")
async def list_products(category: Optional[str] = None, gender: Optional[str] = None,
                        search: Optional[str] = None, trending: Optional[bool] = None,
                        sort: Optional[str] = None, limit: int = 100):
    q = {}
    if category:
        value = category.strip()
        if value:
            q["category"] = {"$regex": f"^{re.escape(value)}$", "$options": "i"}
    if gender:
        value = gender.strip()
        if value:
            q["gender"] = {"$regex": f"^{re.escape(value)}$", "$options": "i"}
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"brand": {"$regex": search, "$options": "i"}},
                    {"category": {"$regex": search, "$options": "i"}}]
    if trending:
        q["trending"] = True
    cursor = db.products.find(q, {"_id": 0})
    if sort == "price_asc":
        cursor = cursor.sort("price", 1)
    elif sort == "price_desc":
        cursor = cursor.sort("price", -1)
    elif sort == "rating":
        cursor = cursor.sort("rating", -1)
    return await cursor.to_list(limit)


@api.get("/products/{pid}")
async def get_product(pid: str):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@api.get("/products/{pid}/delivery")
async def get_product_delivery(pid: str, pin: str, payment_method: str = "card", event_date: Optional[str] = None):
    product = await db.products.find_one({"id": pid}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    return predict_delivery(product, pin, event_date, payment_method)


@api.get("/products/{pid}/reviews")
async def product_reviews(pid: str):
    raw = await db.reviews.find({"product_id": pid}, {"_id": 0}).to_list(200)
    reviews = []
    for r in raw:
        mapped = {
            "id": r.get("id"),
            "name": r.get("reviewer") or r.get("name") or "Customer",
            "location": r.get("region") or r.get("location") or "",
            "size": r.get("size_bought") or r.get("size") or "",
            "rating": r.get("rating") or 0,
            "title": r.get("title") or "",
            "comment": r.get("text") or r.get("comment") or "",
            "image": (r.get("photos") or [None])[0] if r.get("photos") else r.get("image") if r.get("image") else None,
            "sentiment": r.get("sentiment") or ("positive" if (r.get("rating") or 0) >= 4 else ("negative" if (r.get("rating") or 0) <= 2 else "neutral")),
            "helpful": r.get("helpful"),
        }
        reviews.append(mapped)

    total = len(reviews)
    pos = [r for r in reviews if r["rating"] >= 4]
    neg = [r for r in reviews if r["rating"] <= 2]
    complaints = list({(r.get("comment") or "").strip() for r in neg if r.get("comment")})[:3]

    positive_percent = round(len(pos) / total * 100) if total else 0
    negative_percent = round(len(neg) / total * 100) if total else 0

    if positive_percent >= 70:
        positive_text = f"{positive_percent}% of buyers recommend this product."
    elif positive_percent >= 40:
        positive_text = f"{positive_percent}% of buyers recommend this product — mixed reviews."
    else:
        positive_text = f"Only {positive_percent}% of buyers recommend this product — quality concerns reported."

    negative_text = f"{len(neg)} reviewers mentioned issues." if neg else "No major complaints reported."

    summary = {
        "positive": positive_text,
        "negative": negative_text,
        "complaints": complaints,
        "positive_count": len(pos),
        "negative_count": len(neg),
        "positive_percent": positive_percent,
        "negative_percent": negative_percent,
        "highlights": reviews[:4],
    }
    return {"reviews": reviews, "summary": summary}


class VirtualTryOnIn(BaseModel):
    user_image: str
    product_image: Optional[str] = None
    fit_profile: Optional[dict] = None
    selected_size: Optional[str] = None
    selected_color: Optional[str] = None


def _decode_data_url(data_url: str) -> Optional[bytes]:
    if data_url.startswith("data:"):
        parts = data_url.split(",", 1)
        if len(parts) == 2:
            return base64.b64decode(parts[1])
    return None


async def _fetch_remote_image(url: str) -> Optional[bytes]:
    if requests is None:
        logger.warning("requests package is not installed: cannot fetch remote image %s", url)
        return None
    try:
        resp = await asyncio.to_thread(requests.get, url, timeout=10)
        resp.raise_for_status()
        return resp.content
    except Exception as exc:
        logger.warning("Failed to fetch remote image %s: %s", url, exc)
        return None


def _build_tryon_prompt(body: VirtualTryOnIn) -> str:
    outfit_reference = body.product_image or "the selected outfit"
    return (
        "Dress the person in the provided photo in the outfit shown in the product image URL. "
        "Keep the SAME face, SAME skin tone, SAME body shape, SAME hairstyle, SAME facial expression, "
        "and if possible the SAME pose, background, lighting, and shadows. "
        "Do not beautify or alter age, body size, body proportions, facial features, or background. "
        "Only replace the clothing with the selected product. "
        f"Product image reference: {outfit_reference}."
    )


# Absolute path for AI-generated virtual try-on images, independent of the
# working directory the server happens to be launched from.
GENERATED_DIR = ROOT_DIR.parent / "public" / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def _save_generated_image(generated_image: str, destination: Path):
    """
    Save the provider's generated try-on image to `destination`.

    `generated_image` may be either:
      - a remote URL (e.g. LightX/CloudFront output), which we must download, or
      - a local filesystem path (some providers may return one).

    shutil.copy only works for local paths, so a remote URL passed to it
    raises OSError: [Errno 22] Invalid argument. Detect which case we're in
    and handle both.
    """
    is_remote = generated_image.startswith("http://") or generated_image.startswith("https://")

    if is_remote:
        if requests is None:
            raise VTONError("requests package is not installed: cannot download generated image")
        resp = requests.get(generated_image, timeout=30)
        resp.raise_for_status()
        destination.write_bytes(resp.content)
    else:
        shutil.copy(generated_image, destination)


@api.post("/ai/virtual-tryon")
async def ai_virtual_tryon(body: VirtualTryOnIn, user=Depends(get_current_user)):
    logger.info("Virtual try-on request received")
    logger.info("user_image exists: %s", bool(body.user_image))
    logger.info("product_image exists: %s", bool(body.product_image))

    if not body.user_image:
        logger.error("Missing user_image in virtual try-on request")
        raise HTTPException(400, "user_image is required for virtual try-on")

    try:
        logger.info("Before calling generate_virtual_tryon()")
        vton_response = await generate_virtual_tryon(
            user_image=body.user_image,
            product_image=body.product_image or "",
            selected_color=body.selected_color,
            selected_size=body.selected_size,
        )
        logger.info("After receiving response from generate_virtual_tryon(): %s", vton_response)
    except VTONError as exc:
        logger.exception("Virtual try-on generation failed")
        raise HTTPException(500, f"Virtual try-on failed: {exc}")
    except Exception as exc:
        logger.exception("Unexpected error during virtual try-on generation")
        raise HTTPException(500, f"Virtual try-on failed: {exc}")

    generated_image = vton_response.get("generated_image")
    provider = vton_response.get("provider", "idm-vton")

    # Validate BEFORE touching the filesystem, so a missing/empty image
    # fails cleanly with a real error instead of a raw shutil exception.
    if not generated_image:
        logger.error("Virtual try-on provider returned empty generated_image")
        raise HTTPException(500, "Virtual try-on provider returned no image")

    filename = f"{uuid.uuid4()}.png"
    destination = GENERATED_DIR / filename
    try:
        await asyncio.to_thread(_save_generated_image, generated_image, destination)
    except Exception as exc:
        logger.exception("Failed to save generated try-on image to public/generated")
        raise HTTPException(500, f"Could not save generated try-on image: {exc}")
    generated_image_url = f"/generated/{filename}"

    return {
        "generated_image": generated_image_url,
        "vton_provider": provider,
        "fit_analysis": {
            "verdict": "strong_match",
            "confidence": 92,
            "analysis": {
                "size": f"Matched to your selected size {body.selected_size or 'N/A'} and body profile.",
                "fitAnalysis": "AI suggests a flattering fit for your silhouette.",
                "bodyMatch": "Body proportion analysis is positive.",
                "colorMatch": f"Colour match is good for {body.selected_color or 'your chosen shade'}.",
                "drapePrediction": "Fabric drape will look smooth and elegant.",
                "occasion": "Suitable for both casual and dressy occasions.",
                "delivery": "Estimated delivery in 2-4 days.",
                "seller": "Seller has high ratings and fast dispatch.",
                "quality": "High quality sentiment from previous buyers.",
            },
        },
    }


# ---------- BuyReady rule engine ----------
WAREHOUSE_COORDS = {
    "Hyderabad": (17.3850, 78.4867),
    "Bengaluru": (12.9716, 77.5946),
    "Mumbai": (19.0760, 72.8777),
    "Delhi NCR": (28.7041, 77.1025),
    "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639),
}

PIN_REGION_NEAREST = {
    "1": "Delhi NCR",
    "2": "Kolkata",
    "3": "Mumbai",
    "4": "Mumbai",
    "5": "Hyderabad",
    "6": "Chennai",
    "7": "Chennai",
    "8": "Kolkata",
    "9": "Delhi NCR",
}

COURIER_PERFORMANCE = [
    ("BlueDart", 98),
    ("Delhivery", 95),
    ("Ekart", 92),
    ("Shadowfax", 88),
]

PAYMENT_DELAYS = {
    "upi": 0,
    "card": 0,
    "cod": 12,
    "emi": 6,
}

TRANSIT_BANDS = [
    (100, 0),
    (300, 1),
    (700, 2),
    (1200, 3),
    (9999, 5),
]

PROCESSING_LABELS = [
    (300, "Ready stock", 2),
    (800, "Busy warehouse", 12),
    (9999, "Peak sale dispatch tomorrow", 24),
]

MIN_STANDARD_TRANSIT_DAYS = 3
MIN_EXPRESS_TRANSIT_DAYS = 2


def _det(seedstr):
    return random.Random(int(hashlib.md5(seedstr.encode()).hexdigest(), 16) % (10**8))


def _nearest_warehouse_for_pin(pin):
    if not pin or not str(pin).strip():
        return "Hyderabad"
    region = str(pin).strip()[0]
    return PIN_REGION_NEAREST.get(region, "Hyderabad")


def _distance_for_pin(pin, warehouse):
    base = _nearest_warehouse_for_pin(pin)
    if warehouse == base:
        return 150
    distances = {
        ("Hyderabad", "Bengaluru"): 620,
        ("Hyderabad", "Mumbai"): 750,
        ("Hyderabad", "Delhi NCR"): 1200,
        ("Hyderabad", "Chennai"): 560,
        ("Hyderabad", "Kolkata"): 1370,
        ("Bengaluru", "Mumbai"): 980,
        ("Bengaluru", "Delhi NCR"): 2150,
        ("Bengaluru", "Chennai"): 350,
        ("Bengaluru", "Kolkata"): 1640,
        ("Mumbai", "Delhi NCR"): 1410,
        ("Mumbai", "Chennai"): 1330,
        ("Mumbai", "Kolkata"): 2050,
        ("Delhi NCR", "Chennai"): 2200,
        ("Delhi NCR", "Kolkata"): 1500,
        ("Chennai", "Kolkata"): 1650,
    }
    if base == warehouse:
        return 150
    if (base, warehouse) in distances:
        return distances[(base, warehouse)]
    if (warehouse, base) in distances:
        return distances[(warehouse, base)]
    return 1000


def _transit_days_from_distance(distance):
    for limit, days in TRANSIT_BANDS:
        if distance <= limit:
            if limit == 1200 and days == 3:
                return 4 if distance > 1000 else 3
            if limit == 9999 and days == 5:
                return 6 if distance > 1500 else 5
            return days
    return 6


def _select_courier(distance, rng):
    if distance <= 300:
        return COURIER_PERFORMANCE[0]
    if distance <= 700:
        return COURIER_PERFORMANCE[1]
    if distance <= 1200:
        return COURIER_PERFORMANCE[2]
    return COURIER_PERFORMANCE[3]


def _processing_for_distance(distance):
    for limit, label, hours in PROCESSING_LABELS:
        if distance <= limit:
            return label, hours
    return "Ready stock", 2


def _format_eta_label(arrival):
    if not arrival:
        return None
    return arrival.strftime("%a, %d %b")


def _clamp_score(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, int(value)))


def _range_score(value, low, high, buffer=12):
    if value is None or low is None or high is None:
        return 60
    if low <= value <= high:
        return 100
    distance = low - value if value < low else value - high
    if distance <= buffer:
        return _clamp_score(90 - (distance / buffer) * 40)
    return _clamp_score(65 - (distance - buffer) * 2)


def _preferred_fit_score(user_fit, brand_fit):
    if not user_fit or not brand_fit:
        return 80
    if user_fit == brand_fit:
        return 100
    if user_fit == "Regular":
        return 90
    if user_fit == "Relaxed" and brand_fit == "Relaxed":
        return 100
    if user_fit == "Fitted" and brand_fit == "Fitted":
        return 100
    if user_fit == "Relaxed":
        return 85
    if user_fit == "Fitted":
        return 80
    return 75


def _review_bias_score(size_index, num_sizes, review_bias):
    if review_bias == "runs_large":
        return _clamp_score(5 + (num_sizes - 1 - size_index) * 2)
    if review_bias == "runs_small":
        return _clamp_score(5 + size_index * 2)
    return 0


def recommend_size(product, fp, brand=None):
    """Brand-aware size recommendation using user fit profile and brand size chart."""
    if not fp:
        return (None, 0, None, "No fit profile available to recommend a size.")

    usual_size = fp.get("clothing_size")
    brand_chart = None
    brand_fit_type = product.get("fit_type")
    review_bias = None
    if brand:
        brand_chart = brand.get("size_chart")
        brand_fit_type = brand.get("fit_type") or brand_fit_type
        review_bias = brand.get("review_bias")

    # Prefer brand size chart, fall back to product size chart, then to product sizes list
    product_chart = product.get("size_chart") if isinstance(product, dict) else None
    chart = brand_chart or product_chart
    if chart:
        sizes = list(chart.keys())
    else:
        sizes = product.get("sizes") or []

    if not sizes:
        return (None, 0, usual_size, "No available sizes for this product.")

    best_size = None
    best_score = -1
    score_breakdown = {}
    num_sizes = len(sizes)
    for idx, size in enumerate(sizes):
        size_info = chart.get(size, {}) if chart else None
        height_range = size_info.get("height") if size_info else None
        weight_range = size_info.get("weight") if size_info else None
        size_fit_type = size_info.get("fit_type") if size_info else brand_fit_type

        height_score = _range_score(fp.get("height_cm"), *(height_range or [None, None]))
        weight_score = _range_score(fp.get("weight_kg"), *(weight_range or [None, None]))
        fit_score = _preferred_fit_score(fp.get("preferred_fit"), size_fit_type)
        review_score = _review_bias_score(idx, num_sizes, review_bias)
        usual_score = 8 if usual_size and size == usual_size else 0

        total = _clamp_score(
            height_score * 0.4 + weight_score * 0.4 + fit_score * 0.15 + review_score * 0.05 + usual_score
        )
        score_breakdown[size] = {
            "height_score": height_score,
            "weight_score": weight_score,
            "fit_score": fit_score,
            "review_score": review_score,
            "usual_size_bonus": usual_score,
            "total_score": total,
        }
        if total > best_score:
            best_score = total
            best_size = size

    confidence = _clamp_score(best_score - 4)
    reason_parts = []
    if usual_size and best_size != usual_size:
        reason_parts.append(f"Your usual size is {usual_size}, but this brand's measurements match {best_size} better.")
    else:
        reason_parts.append(f"Based on your height and weight, {best_size} is the best match for this brand.")
    if review_bias == "runs_large":
        reason_parts.append("Product reviews show this brand runs larger than average.")
    elif review_bias == "runs_small":
        reason_parts.append("Product reviews show this brand runs smaller than average.")
    elif brand_fit_type:
        reason_parts.append(f"This item is a {brand_fit_type.lower()} fit.")
    reason = " ".join(reason_parts)
    return (best_size, confidence, usual_size, reason)


def _warehouse_processing_for_stock(stock_qty: Optional[int]):
    if stock_qty is None:
        return "Ready stock", 2
    if stock_qty == 0:
        return "Backorder from warehouse", 48
    if stock_qty <= 2:
        return "Limited stock in nearest warehouse", 12
    if stock_qty <= 8:
        return "Busy warehouse", 12
    return "Ready stock", 2


def predict_delivery(product, pin, event_date=None, payment_method="card"):
    rng = _det(product["id"] + (pin or "500081"))
    pm = (payment_method or "card").lower()

    selected_warehouse = product.get("warehouse")
    stock_qty = None
    if product.get("warehouse_stock"):
        available = [(wh, qty) for wh, qty in product["warehouse_stock"].items() if qty > 0]
        if available:
            selected_warehouse = min(available, key=lambda item: _distance_for_pin(pin, item[0]))[0]
            stock_qty = product["warehouse_stock"].get(selected_warehouse, 0)
        else:
            selected_warehouse = product.get("warehouse") or _nearest_warehouse_for_pin(pin)
            stock_qty = product["warehouse_stock"].get(selected_warehouse, 0)

    distance = _distance_for_pin(pin, selected_warehouse)
    warehouse_processing, warehouse_processing_hours = _warehouse_processing_for_stock(stock_qty)
    payment_delay_hours = PAYMENT_DELAYS.get(pm, 0)
    courier, courier_confidence = _select_courier(distance, rng)
    courier_delay_hours = max(0.5, round((100 - courier_confidence) / 10, 1))

    standard_transit_days = max(MIN_STANDARD_TRANSIT_DAYS, _transit_days_from_distance(distance))
    express_transit_days = max(MIN_EXPRESS_TRANSIT_DAYS, standard_transit_days - 1)
    standard_hours = warehouse_processing_hours + payment_delay_hours + standard_transit_days * 24 + courier_delay_hours
    express_hours = warehouse_processing_hours + payment_delay_hours + express_transit_days * 24 + courier_delay_hours

    today = datetime.now(timezone.utc)
    standard_eta = today + timedelta(hours=standard_hours)
    express_eta = today + timedelta(hours=express_hours)
    standard_label = _format_eta_label(standard_eta)
    express_label = _format_eta_label(express_eta)

    options = [
        {"type": "standard", "label": "Free Delivery", "date": standard_label, "days": max(0, (standard_eta.date() - today.date()).days), "fee": 0, "arrival_iso": standard_eta.isoformat(), "meets_event": None, "color": "green"},
        {"type": "express", "label": "Express Delivery", "date": express_label, "days": max(0, (express_eta.date() - today.date()).days), "fee": 99, "arrival_iso": express_eta.isoformat(), "meets_event": None, "color": "green"},
    ]

    distance_penalty = min(30, int(distance / 60))
    processing_score = 100 - ({"Ready stock": 0, "Busy warehouse": 8, "Limited stock in nearest warehouse": 12, "Backorder from warehouse": 35, "Peak sale dispatch tomorrow": 15}[warehouse_processing])
    confidence = int((courier_confidence + processing_score + (100 - distance_penalty)) / 3)

    result = {
        "options": options,
        "confidence": confidence,
        "warehouse": selected_warehouse,
        "warehouse_distance_km": distance,
        "warehouse_processing": warehouse_processing,
        "warehouse_processing_hours": warehouse_processing_hours,
        "warehouse_stock_qty": stock_qty,
        "payment_method": pm,
        "payment_delay_hours": payment_delay_hours,
        "transit_days": standard_transit_days,
        "courier": courier,
        "courier_confidence": courier_confidence,
        "courier_delay_hours": courier_delay_hours,
        "express_bonus_days": 1,
        "estimated_date": standard_eta.isoformat(),
        "estimated_label": standard_label,
        "express_estimated_date": express_eta.isoformat(),
        "express_estimated_label": express_label,
        "on_time_for_event": None,
        "buffer_days": None,
        "arrives_early_text": None,
        "alternative": None,
        "status": "on_time",
        "prediction_text": f"Arrives by {standard_label}",
        "event_notice": None,
    }

    # Per-option status relative to an event/gift date
    if event_date:
        try:
            ev = datetime.fromisoformat(event_date).replace(tzinfo=timezone.utc)
            std_buffer = (ev.date() - standard_eta.date()).days
            exp_buffer = (ev.date() - express_eta.date()).days
            result["buffer_days"] = std_buffer
            # mark per-option meets_event and color
            options[0]["meets_event"] = std_buffer >= 0
            options[1]["meets_event"] = exp_buffer >= 0
            options[0]["color"] = "green" if options[0]["meets_event"] else "yellow"
            options[1]["color"] = "green" if options[1]["meets_event"] else "yellow"

            # overall flags and notices
            if options[0]["meets_event"]:
                result["on_time_for_event"] = True
                if std_buffer >= 1:
                    result["arrives_early_text"] = f"Arrives {std_buffer} day{'s' if std_buffer > 1 else ''} before your event"
                    result["event_notice"] = result["arrives_early_text"]
                else:
                    result["event_notice"] = "✔ Arrives by your event date"
            elif options[1]["meets_event"]:
                result["on_time_for_event"] = True
                result["status"] = "may_arrive_after"
                result["event_notice"] = "⚠ Standard may miss — Express arrives by your event"
                result["alternative"] = "Choose Express Delivery to arrive by your event date."
            else:
                result["on_time_for_event"] = False
                result["status"] = "late"
                result["event_notice"] = "⚠ Won't arrive before your event"
                result["alternative"] = "This item may not arrive before your event. Check Nearby Alternatives for faster stock."
                # If both options miss, add suggestion flag
                result["both_miss_event"] = True
        except ValueError:
            pass
    else:
        # Casual / no event: mark both options as green (expected on-time)
        options[0]["meets_event"] = True
        options[1]["meets_event"] = True
        options[0]["color"] = "green"
        options[1]["color"] = "green"

    return result


PURPOSE_NOTES = {
    "Wedding": "festive-ready with premium finish",
    "Festival": "perfect for festive occasions",
    "Office": "office-appropriate and comfortable for long wear",
    "Casual": "great for everyday comfort",
    "Gift": "gift-worthy with premium packaging available",
}


def build_evaluation(product, fp, address, purpose, event_date, reviews_summary, payment_method="card", selected_size=None, brand=None):
    recommended_size, base_fit_conf, usual_size, recommended_reason = recommend_size(product, fp, brand) if fp else (None, 0, None, "No fit profile available.")
    selected_size = selected_size or recommended_size
    selected_fit_conf = base_fit_conf
    fit_mismatch = False
    if selected_size and recommended_size and selected_size != recommended_size:
        sizes = product.get("sizes") or []
        if selected_size in sizes and recommended_size in sizes:
            delta = abs(sizes.index(selected_size) - sizes.index(recommended_size))
            penalty = min(30, 15 + delta * 10)
        else:
            penalty = 20
        selected_fit_conf = max(10, base_fit_conf - penalty)
        fit_mismatch = True

    delivery = predict_delivery(product, address["pin"] if address else None, event_date, payment_method)
    seller = product["seller"]
    trust_score = int(min(97, seller["rating"] * 16 + (10 - seller["return_rate"]) * 2))
    return_risk = int(min(95, seller["return_rate"] + (18 if fit_mismatch else 0)))
    occasion = 0
    if purpose:
        occasion = 70
        if delivery["on_time_for_event"] is True or event_date is None:
            occasion += 20
        if product["category"] in ("Sarees", "Lehengas", "Kurtas") and purpose in ("Wedding", "Festival"):
            occasion += 8
        occasion = min(98, occasion)
    value_score = int(min(96, product["discount"] * 0.8 + (25 if product["price"] <= product["historical_low"] * 1.05 else 10) + 30))
    overall = int((selected_fit_conf * 0.35 + trust_score * 0.25 + value_score * 0.2 + (occasion or 70) * 0.2))
    verdict = "Buy with Confidence" if overall >= 80 else ("Good Choice" if overall >= 65 else ("Worth Considering" if overall >= 55 else "Think Twice"))

    fp_name = fp["name"] if fp else "your"
    fit_direction = "" 
    if selected_size and recommended_size and selected_size != recommended_size:
        relation = "tighter" if (product.get("sizes") or []).index(selected_size) < (product.get("sizes") or []).index(recommended_size) else "looser"
        fit_direction = f" You selected {selected_size}, which is expected to fit {relation} than the recommended size {recommended_size}."

    why = {
        "fit": {
            "en": f"Based on {fp_name}'s fit profile ({fp['height_cm']}cm, {fp['weight_kg']}kg, {fp['body_shape']} shape), size {recommended_size} is recommended with {selected_fit_conf}% confidence.{fit_direction} {int(product['size_accuracy'])}% of buyers said this item is true to size." if fp else "Create a fit profile to get a personalised size recommendation.",
            "hi": f"{fp_name} ki fit profile ke aadhaar par, size {recommended_size} recommend kiya gaya hai {selected_fit_conf}% confidence ke saath.{fit_direction} {int(product['size_accuracy'])}% kharidaaron ne kaha ki yeh size bilkul sahi hai." if fp else "Size suggestion ke liye fit profile banayein.",
            "te": f"{fp_name} fit profile aadharanga, size {recommended_size} ni {selected_fit_conf}% confidence tho recommend chestunnamu.{fit_direction} {int(product['size_accuracy'])}% konugoludala size sari ani chepparu." if fp else "Fit profile create cheyandi size suggestion kosam.",
        },
        "delivery": {
            "en": f"Ships from {product['warehouse']} warehouse with {delivery['confidence']}% on-time confidence. " + (delivery["arrives_early_text"] or f"Standard delivery in {delivery['options'][0]['days']} days.") + (" We add a safety buffer so it reaches before your event." if event_date else ""),
            "hi": f"{product['warehouse']} warehouse se bheja jayega, {delivery['confidence']}% on-time confidence ke saath. Standard delivery {delivery['options'][0]['days']} din mein.",
            "te": f"{product['warehouse']} warehouse nunchi {delivery['confidence']}% on-time confidence tho pampinchabadutundi. Standard delivery {delivery['options'][0]['days']} rojullo.",
        },
        "trust": {
            "en": f"Sold by {seller['name']} — {seller['rating']}★ seller rating, {seller['years']} years on platform, only {seller['return_rate']}% return rate. {reviews_summary.get('positive_percent', 80)}% positive reviews. 100% Original guarantee.",
            "hi": f"{seller['name']} dwara becha gaya — {seller['rating']}★ rating, sirf {seller['return_rate']}% return rate. {reviews_summary.get('positive_percent', 80)}% positive reviews.",
            "te": f"{seller['name']} vaaru ammutunnaru — {seller['rating']}★ rating, kevalam {seller['return_rate']}% return rate. {reviews_summary.get('positive_percent', 80)}% positive reviews.",
        },
        "value": {
            "en": f"At ₹{product['price']} ({product['discount']}% off MRP ₹{product['mrp']}), this is {'at its historical low price — a great time to buy' if product['price'] <= product['historical_low'] * 1.05 else 'close to its best recorded price'}. Price trend: {product['price_trend']}." + (f" This piece is {PURPOSE_NOTES.get(purpose, '')}." if purpose else ""),
            "hi": f"₹{product['price']} par ({product['discount']}% off), yeh apne sabse kam daam ke kareeb hai. Kharidne ka accha samay hai.",
            "te": f"₹{product['price']} ki ({product['discount']}% off), idi daani best price ki daggaraga undi. Konataniki manchi samayam.",
        },
    }
    return {
        "usual_size": usual_size,
        "recommended_size": recommended_size,
        "selected_size": selected_size,
        "fit_confidence": selected_fit_conf,
        "recommendation_reason": recommended_reason,
        "occasion_readiness": occasion,
        "trust_score": trust_score,
        "return_risk": return_risk,
        "value_score": value_score,
        "overall_score": overall,
        "verdict": verdict,
        "delivery": delivery,
        "why": why,
        "unlocked": bool(fp and address and purpose),
    }


@api.post("/buyready/evaluate")
async def evaluate(body: EvaluateIn, user=Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Debug logging
    print(f"DEBUG evaluate: fit_profile_id={body.fit_profile_id}, user fit_profiles={[f.get('id') for f in user.get('fit_profiles', [])]}")
    
    fp = next((f for f in user["fit_profiles"] if f["id"] == body.fit_profile_id), None) if body.fit_profile_id else None
    address = next((a for a in user["addresses"] if a["id"] == body.address_id), None) if body.address_id else None
    brand = await db.brands.find_one({"brand": product.get("brand")}, {"_id": 0})
    
    print(f"DEBUG: Found fit_profile={fp is not None}, address={address is not None}, product_sizes={product.get('sizes', [])}, brand={bool(brand)}")
    
    reviews = await db.reviews.find({"product_id": body.product_id}, {"_id": 0}).to_list(50)
    pos = len([r for r in reviews if r["sentiment"] == "positive"])
    summary = {"positive_percent": round(pos / len(reviews) * 100) if reviews else 80}
    
    result = build_evaluation(product, fp, address, body.purpose, body.event_date, summary, (body.payment_method or "card"), body.selected_size, brand)
    print(f"DEBUG evaluate result: recommended_size={result.get('recommended_size')}, fit_confidence={result.get('fit_confidence')}")
    return result


def rank_better_choice_results(options):
    """Rank alternatives by delivery speed, warehouse stock, distance, then score."""
    def sort_key(item):
        stock_qty = item.get("warehouse_stock_qty")
        stock_rank = -stock_qty if stock_qty is not None else 1
        return (
            item.get("delivery_days", 999),
            stock_rank,
            item.get("warehouse_distance_km", 9999),
            -item.get("score", 0),
        )
    return sorted(options, key=sort_key)


@api.post("/buyready/better-choice")
async def better_choice(body: EvaluateIn, user=Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    similar = await db.products.find(
        {"category": product["category"], "id": {"$ne": product["id"]},
         "price": {"$gte": product["price"] * 0.5, "$lte": product["price"] * 1.6}},
        {"_id": 0}).to_list(100)
    fp = next((f for f in user["fit_profiles"] if f["id"] == body.fit_profile_id), None) if body.fit_profile_id else (user["fit_profiles"][0] if user["fit_profiles"] else None)
    address = next((a for a in user["addresses"] if a["id"] == body.address_id), None) if body.address_id else (user["addresses"][0] if user["addresses"] else None)
    results = []
    brand_cache = {}
    current_standard_days = None
    for p in [product] + similar:
        brand_name = p.get("brand")
        if brand_name not in brand_cache:
            brand_cache[brand_name] = await db.brands.find_one({"brand": brand_name}, {"_id": 0})
        ev = build_evaluation(p, fp, address, body.purpose, body.event_date, {"positive_percent": 80}, payment_method="card", brand=brand_cache[brand_name])
        delivery_days = ev["delivery"]["options"][0]["days"]
        if p["id"] == product["id"]:
            current_standard_days = delivery_days
        reasons = []
        if ev["fit_confidence"] > 85:
            reasons.append("Better Fit")
        if current_standard_days is not None and delivery_days <= max(0, current_standard_days - 1):
            reasons.append("Earlier Delivery")
        if p["return_percent"] < 6:
            reasons.append("Lower Return Risk")
        if p["discount"] >= 50:
            reasons.append("Better Value")
        results.append({
            "product": p,
            "score": ev["overall_score"],
            "fit_confidence": ev["fit_confidence"],
            "delivery_days": delivery_days,
            "warehouse_distance_km": ev["delivery"].get("warehouse_distance_km"),
            "warehouse_stock_qty": ev["delivery"].get("warehouse_stock_qty"),
            "return_percent": p["return_percent"],
            "reasons": reasons,
        })
    best = max(results, key=lambda r: r["score"])
    express_threshold = max(0, (current_standard_days or 0) - 1)
    faster_alternatives = [r for r in results[1:] if r["delivery_days"] <= express_threshold]
    if faster_alternatives:
        alternatives = rank_better_choice_results(faster_alternatives)
    else:
        alternatives = rank_better_choice_results(results[1:])
    return {"current": results[0], "alternatives": alternatives, "recommended_id": best["product"]["id"]}


# ---------- fit profiles / addresses ----------
@api.post("/me/fit-profiles")
async def add_fit_profile(body: FitProfileIn, user=Depends(get_current_user)):
    fp = {**body.model_dump(), "id": str(uuid.uuid4())}
    await db.users.update_one({"id": user["id"]}, {"$push": {"fit_profiles": fp}, "$set": {"active_fit_profile": fp["id"], "fit_profile_done": True}})
    return fp


@api.put("/me/fit-profiles/{fpid}/activate")
async def activate_fp(fpid: str, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"active_fit_profile": fpid}})
    return {"ok": True}


@api.post("/me/skip-fit-profile")
async def skip_fp(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"fit_profile_done": True}})
    return {"ok": True}


@api.post("/me/addresses")
async def add_address(body: AddressIn, user=Depends(get_current_user)):
    addr = {**body.model_dump(), "id": str(uuid.uuid4()), "default": len(user["addresses"]) == 0}
    await db.users.update_one({"id": user["id"]}, {"$push": {"addresses": addr}})
    return addr


@api.put("/me/addresses/{addr_id}")
async def update_address(addr_id: str, body: AddressIn, user=Depends(get_current_user)):
    existing = next((a for a in user.get("addresses", []) if a["id"] == addr_id), None)
    if not existing:
        raise HTTPException(404, "Address not found")
    update_fields = {f"addresses.$.{k}": v for k, v in body.model_dump().items()}
    update_fields[f"addresses.$.default"] = existing.get("default", False)
    await db.users.update_one({"id": user["id"], "addresses.id": addr_id}, {"$set": update_fields})
    return {**body.model_dump(), "id": addr_id, "default": existing.get("default", False)}


# ---------- wishlist / cart ----------
@api.post("/me/wishlist/{pid}")
async def toggle_wishlist(pid: str, user=Depends(get_current_user)):
    if pid in user["wishlist"]:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"wishlist": pid}})
        return {"wishlisted": False}
    await db.users.update_one({"id": user["id"]}, {"$push": {"wishlist": pid}})
    return {"wishlisted": True}


@api.get("/me/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    return await db.products.find({"id": {"$in": user["wishlist"]}}, {"_id": 0}).to_list(100)


@api.post("/me/cart")
async def add_to_cart(body: CartItemIn, user=Depends(get_current_user)):
    cart = user["cart"]
    for item in cart:
        if item["product_id"] == body.product_id and item.get("size") == body.size:
            item["qty"] = max(0, item["qty"] + body.qty)
            break
    else:
        if body.qty > 0:
            cart.append({"product_id": body.product_id, "size": body.size, "qty": body.qty})
    cart = [i for i in cart if i["qty"] > 0]
    await db.users.update_one({"id": user["id"]}, {"$set": {"cart": cart}})
    return cart


@api.delete("/me/cart/{pid}")
async def remove_cart(pid: str, size: Optional[str] = None, user=Depends(get_current_user)):
    cart = [i for i in user["cart"] if not (i["product_id"] == pid and (size is None or i.get("size") == size))]
    await db.users.update_one({"id": user["id"]}, {"$set": {"cart": cart}})
    return cart


@api.get("/me/cart")
async def get_cart(user=Depends(get_current_user)):
    pids = [i["product_id"] for i in user["cart"]]
    products = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(100)
    pmap = {p["id"]: p for p in products}
    return [{**i, "product": pmap.get(i["product_id"])} for i in user["cart"] if i["product_id"] in pmap]


# ---------- orders ----------
STAGES = ["placed", "packed", "shipped", "out_for_delivery", "delivered"]
STAGE_LABELS = {"placed": "Order Placed", "packed": "Packed", "shipped": "Shipped",
                "out_for_delivery": "Out for Delivery", "delivered": "Delivered"}
COUPONS = {"BUYREADY10": 10, "MYNTRA20": 20, "FIRST50": 50}


@api.get("/coupons/{code}")
async def check_coupon(code: str):
    pct = COUPONS.get(code.upper())
    if not pct:
        raise HTTPException(404, "Invalid coupon code")
    return {"code": code.upper(), "percent": pct}


async def notify(user_id, title, body, ntype="order"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "title": title, "body": body,
        "type": ntype, "read": False, "created_at": datetime.now(timezone.utc).isoformat()})


def resolve_delivery_window(delivery_type: str, delivery_preference: Optional[str], preferred_date: Optional[str]):
    base_days = {"standard": 4, "express": 2, "same_day": 0}.get(delivery_type, 4)
    now = datetime.now(timezone.utc)
    earliest = now + timedelta(days=base_days)
    suggested_dt = earliest
    message = None
    if preferred_date:
        try:
            preferred_dt = datetime.fromisoformat(preferred_date).replace(tzinfo=timezone.utc)
            if preferred_dt.date() < earliest.date():
                suggested_dt = earliest
                if (delivery_preference or "normal") in ("gift", "event"):
                    message = "We'll deliver before your selected event date."
                else:
                    message = "Your selected date falls before our earliest available slot, so we have scheduled the nearest available date."
            else:
                suggested_dt = preferred_dt
                if (delivery_preference or "normal") in ("gift", "event"):
                    message = "We'll deliver before your selected event date."
        except ValueError:
            suggested_dt = earliest
    elif (delivery_preference or "normal") in ("gift", "event"):
        message = "We'll deliver before your selected event date."
    return suggested_dt, message


@api.post("/orders")
async def create_order(body: OrderIn, user=Depends(get_current_user)):
    address = next((a for a in user["addresses"] if a["id"] == body.address_id), None)
    if not address:
        raise HTTPException(400, "Address not found")
    pids = [i.product_id for i in body.items]
    products = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(100)
    pmap = {p["id"]: p for p in products}
    items, subtotal = [], 0
    for i in body.items:
        p = pmap.get(i.product_id)
        if not p:
            continue
        items.append({
            "product_id": p["id"],
            "name": p["name"],
            "brand": p["brand"],
            "image": p["images"][0],
            "price": p["price"],
            "size": i.size,
            "color": i.color or p.get("color") or p.get("colour"),
            "qty": i.qty,
            "warehouse": p["warehouse"],
        })
        subtotal += p["price"] * i.qty
    if not items:
        raise HTTPException(400, "No valid items")
    discount = int(subtotal * COUPONS.get((body.coupon or "").upper(), 0) / 100)
    delivery_fee = {"standard": 0, "express": 99, "same_day": 199}.get(body.delivery_type, 0)
    total = subtotal - discount + delivery_fee
    now = datetime.now(timezone.utc)
    delivery_preference = (body.delivery_preference or "normal").lower()
    preferred_date = body.preferred_delivery_date
    suggested_dt, delivery_message = resolve_delivery_window(body.delivery_type, delivery_preference, preferred_date)
    courier_partner = {"express": "Delhivery Air", "same_day": "Blue Dart", "standard": "Delhivery"}.get(body.delivery_type, "Delhivery")
    # Compute BuyReady evaluation for primary item to store a confidence score
    try:
        primary_pid = pids[0]
        primary_product = pmap.get(primary_pid)
        fp = None
        if user.get("active_fit_profile"):
            fp = next((f for f in user.get("fit_profiles", []) if f["id"] == user.get("active_fit_profile")), None)
        brand = None
        if primary_product:
            brand = await db.brands.find_one({"brand": primary_product.get("brand")}, {"_id": 0})
        evaluation = build_evaluation(primary_product, fp, address, body.purpose, body.event_date, {"positive_percent": 80}, payment_method="card", brand=brand) if primary_product else None
        buyready_score = evaluation["overall_score"] if evaluation else None
    except Exception:
        buyready_score = None
    order = {
        "id": f"OD{now.strftime('%y%m%d')}{random.randint(10000, 99999)}",
        "user_id": user["id"], "items": items, "address": address,
        "payment_method": body.payment_method, "delivery_type": body.delivery_type,
        "subtotal": subtotal, "discount": discount, "delivery_fee": delivery_fee, "total": total,
        "coupon": (body.coupon or "").upper() or None,
        "purpose": body.purpose, "event_date": body.event_date,
        "delivery_preference": delivery_preference,
        "preferred_delivery_date": preferred_date,
        "suggested_delivery_date": suggested_dt.date().isoformat(),
        "delivery_message": delivery_message,
        "gift_wrap": bool(body.gift_wrap),
        "gift_message": body.gift_message or None,
        "tracking_number": f"MN{now.strftime('%y%m%d')}{random.randint(100000, 999999)}",
        "courier_partner": courier_partner,
        "buyready_score": buyready_score,
        "packaging": {"type": ("Gift" if bool(body.gift_wrap) else "Standard"), "items": [it["name"] for it in items]},
        "estimated_delivery_date": suggested_dt.date().isoformat(),
        "status": "placed", "eta": suggested_dt.isoformat(),
        "ordered_at": now.isoformat(),
        "packguard": {"status": "pending", "final_status": "pending", "stage": "pending", "started_at": now.isoformat()},
        "dispatch_blocked": False,
        "timeline": [{"stage": "placed", "label": STAGE_LABELS["placed"], "at": now.isoformat(), "done": True}] +
                    [{"stage": s, "label": STAGE_LABELS[s], "at": None, "done": False} for s in STAGES[1:]],
        "fit_feedback": None, "return_status": None,
        "created_at": now.isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    await db.users.update_one({"id": user["id"]}, {"$set": {"cart": []}})
    days_until_delivery = max(0, (suggested_dt - now).days)
    await notify(user["id"], "Order Placed 🎉", f"Your order {order['id']} has been placed. Expected by {(now + timedelta(days=days_until_delivery)).strftime('%d %b')}.")
    return order


@api.get("/orders")
async def list_orders(user=Depends(get_current_user)):
    return await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.get("/orders/{oid}")
async def get_order(oid: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return order


NOTIF_TEXT = {
    "packed": ("Order Packed 📦", "Your order {oid} has been packed at the warehouse."),
    "shipped": ("Order Shipped 🚚", "Your order {oid} is on its way!"),
    "out_for_delivery": ("Out for Delivery 🛵", "Your order {oid} is out for delivery. Arriving today!"),
    "delivered": ("Delivered ✅", "Your order {oid} was delivered. Tell us how the fit was!"),
}


@api.post("/orders/{oid}/advance")
async def advance_order(oid: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    idx = STAGES.index(order["status"])
    if idx >= len(STAGES) - 1:
        return order
    new_status = STAGES[idx + 1]
    now = datetime.now(timezone.utc).isoformat()
    for t in order["timeline"]:
        if t["stage"] == new_status:
            t["done"] = True
            t["at"] = now
    await db.orders.update_one({"id": oid}, {"$set": {"status": new_status, "timeline": order["timeline"]}})
    order["status"] = new_status
    title, body_t = NOTIF_TEXT[new_status]
    await notify(user["id"], title, body_t.format(oid=oid))
    return order


@api.post("/orders/{oid}/cancel")
async def cancel_order(oid: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    if order["status"] in {"delivered", "canceled", "cancelled"}:
        raise HTTPException(400, "This order cannot be cancelled")

    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": oid},
        {"$set": {"status": "canceled", "cancellation_requested_at": now}},
    )
    order["status"] = "canceled"
    order["cancellation_requested_at"] = now
    await notify(user["id"], "Order Cancellation Requested", f"Your order {oid} cancellation request has been received. We'll confirm shortly.", "order")
    return order


@api.get("/orders/{oid}/monitor")
async def order_monitor(oid: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    rng = _det(oid)
    checks = [
        {"factor": "Weather", "status": "clear", "detail": f"No rain forecast along the {order['items'][0]['warehouse']} route"},
        {"factor": "Traffic", "status": "clear", "detail": "Normal traffic conditions on delivery route"},
        {"factor": "Warehouse Load", "status": "clear", "detail": "Warehouse operating at normal capacity"},
        {"factor": "Courier Network", "status": "clear", "detail": "Courier partner running on schedule"},
    ]
    delayed = rng.random() < 0.4 and order["status"] in ("placed", "packed", "shipped")
    if delayed:
        issue = rng.choice([
            ("Weather", "Heavy rain predicted near the delivery hub — possible 1-day delay"),
            ("Warehouse Load", "High festive order volume at warehouse — possible 1-day delay"),
            ("Courier Network", "Courier partner reporting delays in your PIN area"),
        ])
        for c in checks:
            if c["factor"] == issue[0]:
                c["status"] = "risk"
                c["detail"] = issue[1]
    options = []
    if delayed:
        options = [
            {"id": "express", "label": "Upgrade to Express", "detail": "Free upgrade — we'll prioritise your parcel", "icon": "zap"},
            {"id": "nearby", "label": "Replace with Nearby Stock", "detail": "Same item shipped from a closer warehouse", "icon": "map-pin"},
            {"id": "accept", "label": "Accept 1-Day Delay", "detail": "No action needed, we'll keep you posted", "icon": "clock"},
        ]
    return {"delayed": delayed, "checks": checks, "options": options,
            "message": "Potential delay detected. Choose how you'd like us to handle it." if delayed else "All systems green — your order is on track."}


@api.post("/orders/{oid}/monitor/resolve")
async def resolve_delay(oid: str, body: dict, user=Depends(get_current_user)):
    action = body.get("action")
    msgs = {
        "express": ("Upgraded to Express ⚡", "Your order has been upgraded to Express delivery at no extra cost."),
        "nearby": ("Stock Replaced 📍", "Your item will now ship from a nearby warehouse — back on schedule."),
        "accept": ("Delay Accepted 🕐", "We've noted it. We'll keep monitoring and update you."),
    }
    title, msg = msgs.get(action, msgs["accept"])
    await notify(user["id"], title, msg, "monitor")
    return {"message": msg}


@api.post("/orders/{oid}/feedback")
async def fit_feedback(oid: str, body: FeedbackIn, user=Depends(get_current_user)):
    await db.orders.update_one({"id": oid, "user_id": user["id"]}, {"$set": {"fit_feedback": body.fit}})
    suggestion = None
    if body.fit == "tight":
        suggestion = "Size felt tight? We recommend a free size exchange to the next size up — no return needed."
    elif body.fit == "loose":
        suggestion = "A quick alteration or exchanging to one size down can give you the perfect fit."
    return {"ok": True, "suggestion": suggestion}


@api.get("/orders/{oid}/return-options")
async def return_options(oid: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return {"options": [
        {"id": "styling", "title": "Get Styling Tips", "detail": "Our stylists share 3 ways to style this piece so it works for you", "icon": "sparkles"},
        {"id": "exchange", "title": "Free Size Exchange", "detail": "Swap for a different size — picked up and delivered free", "icon": "repeat"},
        {"id": "care", "title": "Fabric Care Guide", "detail": "Wash-care tips to fix stiffness, shrinkage or fading concerns", "icon": "shirt"},
        {"id": "expert", "title": "Talk to a Fit Expert", "detail": "2-min chat to solve fit issues before returning", "icon": "headphones"},
    ]}


@api.post("/verify-product-image")
async def verify_product_image(file: UploadFile = File(...), order_id: str = Form(...), user=Depends(get_current_user)):
    """Verify product image matches the original image from packaging"""
    
    # Get order to verify
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    
    if not order.get("items"):
        raise HTTPException(400, "Order has no items")

    # Check if order has warehouse verification image
    warehouse_image_url = order.get("packguard", {}).get("warehouse_image_url")
    if not warehouse_image_url:
        raise HTTPException(400, "Original warehouse image not found for this order")

    # Read uploaded return image
    user_image_bytes = await file.read()
    if not user_image_bytes:
        raise HTTPException(400, "Image file is empty")

    try:
        # Read original warehouse image
        warehouse_image_path = ROOT_DIR / warehouse_image_url.lstrip("/")
        if not warehouse_image_path.exists():
            raise HTTPException(500, "Original image file not found on server")
        
        warehouse_image_bytes = warehouse_image_path.read_bytes()

        # Build product context with the ordered product's catalog image if available,
        # otherwise fallback to the warehouse image reference.
        primary_item = order["items"][0]
        catalog_image_url = order.get("packguard", {}).get("catalog_image_url") or primary_item.get("image") or primary_item.get("image_url")
        if not catalog_image_url:
            catalog_image_url = warehouse_image_url

        product_context = {
            "id": primary_item.get("product_id"),
            "name": primary_item.get("name"),
            "brand": primary_item.get("brand"),
            "sku": primary_item.get("sku"),
            "image": catalog_image_url,
            "image_url": catalog_image_url,
            "images": [catalog_image_url],
            "color": primary_item.get("color") or primary_item.get("colour"),
            "category": primary_item.get("category"),
            "warehouse_image_url": warehouse_image_url,
        }

        # Create data URL for the user's uploaded image
        user_content_type = file.content_type or "image/jpeg"
        user_image_ref = {"type": "dataUrl", "value": _create_data_url_image(user_image_bytes, user_content_type)}

        # Compare the two images using vision client
        try:
            print("\n========== IMAGE DEBUG ==========")
            print("Catalog Image:", product_context.get("catalog_image"))
            print("Warehouse Image:", product_context.get("warehouse_image"))
            print("User Image:", user_image_ref)
            print("================================\n")
            verification_result = compare_product_images(product_context, user_image_ref)
            print("\n========== RETURN VERIFICATION ==========")
            print("Raw Result:", verification_result)
            print("Overall Similarity:", verification_result.get("overallSimilarity"))
            print("Confidence:", verification_result.get("confidence"))
            print("========================================\n")
        except VisionProviderNotConfiguredError as exc:
            raise HTTPException(500, detail={"message": str(exc), "error_code": "vision_provider_missing"})
        except Exception:
            # Fallback: simple hash comparison if vision fails
            import hashlib
            warehouse_hash = hashlib.sha256(warehouse_image_bytes).hexdigest()
            user_hash = hashlib.sha256(user_image_bytes).hexdigest()
            verification_result = {
                "overallSimilarity": 100 if warehouse_hash == user_hash else 0,
                "productTypeMatch": warehouse_hash == user_hash
            }

        # Check if images match (80%+ similarity)
        similarity = verification_result.get("overallSimilarity", 0)
        verified = bool(similarity >= 80)

        if verified:
            return {
                "verified": True,
                "message": "✓ Return Confirmed - Images match!",
                "detail": "Your product matches our records. Return has been confirmed.",
                "similarity": round(similarity, 1)
            }
        else:
            # Images don't match - run PackGuard AI to get detailed mismatch reasons
            try:
                packguard_result = run_packguard_ai(product_context, {
                    "warehouse_image": user_image_ref,
                    "scanned_sku": primary_item.get("sku", "")
                })
                
                mismatch_details = {
                    "sku_match": packguard_result.get("sku_match"),
                    "product_match": packguard_result.get("product_match"),
                    "brand_match": packguard_result.get("brand_match"),
                    "color_match": packguard_result.get("color_match"),
                    "pattern_match": packguard_result.get("pattern_match"),
                    "confidence": packguard_result.get("confidence"),
                    "mismatch_reasons": packguard_result.get("mismatch_reasons", [])
                }
                
                return {
                    "verified": False,
                    "message": "We will reach out to verify",
                    "detail": "The image doesn't match our records. Our team will review and contact you.",
                    "similarity": round(similarity, 1),
                    "mismatch_analysis": mismatch_details
                }
            except Exception as e:
                logger.warning("PackGuard analysis failed, returning basic mismatch: %s", str(e))
                return {
                    "verified": False,
                    "message": "We will reach out to verify",
                    "detail": "The image doesn't match our records. Our team will review and contact you.",
                    "similarity": round(similarity, 1)
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Product verification failed for order=%s", order_id)
        raise HTTPException(500, f"Product verification error: {str(e)}")





@api.post("/orders/{oid}/return")
async def request_return(
    oid: str,
    issue_type: str = Form(...),
    reason: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    user_image: Optional[UploadFile] = File(None),
    user=Depends(get_current_user),
):
    order = await db.orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    if order.get("return_status") in {"accepted", "requested", "rejected"}:
        raise HTTPException(400, "Return request already exists for this order")

    # Accept various return reasons
    valid_reasons = {"size", "color", "damaged", "not_as_described", "changed_mind", "quality", "misproduct"}
    if issue_type not in valid_reasons:
        raise HTTPException(400, f"Unsupported return issue type. Valid types: {', '.join(valid_reasons)}")

    now_iso = datetime.now(timezone.utc).isoformat()
    return_request = {
        "requested_at": now_iso,
        "issue_type": issue_type,
        "reason": reason,
        "notes": notes,
        "user_image_url": None,
        "verified": True,  # Already verified via image matching
        "accepted": True,  # Auto-accept since product was verified
        "verification_result": None,
    }

    # All verified return reasons are accepted
    return_status = "accepted"
    message = f"Return accepted for {issue_type.replace('_', ' ')} issue. Please ship the item back to us."

    await db.orders.update_one({"id": oid}, {"$set": {"return_status": return_status, "return_request": return_request}})
    await notify(user["id"], "Return Accepted ✓", f"Return for order {oid} has been accepted. Pickup within 2 days.", "return")
    return {"ok": True, "accepted": True, "return_status": return_status, "message": message}


UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "qrcodes").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "warehouse").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "returns").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "temp").mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount(
    "/generated",
    StaticFiles(directory=str(GENERATED_DIR)),
    name="generated",
)

# Expose product catalog images from the project's public/products folder
PRODUCTS_DIR = ROOT_DIR.parent / "public" / "products"
if PRODUCTS_DIR.exists():
    app.mount("/products", StaticFiles(directory=PRODUCTS_DIR), name="products")
else:
    logger.warning("Products directory not found: %s", PRODUCTS_DIR)


def get_allowed_origins():
    raw = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
    allowed = [origin.strip() for origin in raw.split(',') if origin.strip()]
    allowed.extend([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
    ])
    return allowed


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- notifications ----------
@api.get("/me/notifications")
async def get_notifications(user=Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.post("/me/notifications/read-all")
async def read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


app.include_router(api)


@app.on_event("startup")
async def startup():
    max_retries = 5
    delay_seconds = 2
    for attempt in range(1, max_retries + 1):
        try:
            # Ping Atlas to verify connectivity
            await client.admin.command('ping')
            logger.info("Connected to MongoDB Atlas")
            logger.info(f"Database: {DB_NAME}")

            # Ensure indexes and seed data
            await db.users.create_index("email", unique=True)
            await db.users.create_index("id")
            await db.products.create_index("id")
            await db.orders.create_index("user_id")
            await db.notifications.create_index("user_id")
            await seed_db(db)
            logger.info("Seed complete")
            return
        except asyncio.CancelledError:
            logger.warning("Startup cancelled during MongoDB connectivity check")
            raise
        except Exception as e:
            logger.warning(f"MongoDB Atlas connection attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                await asyncio.sleep(delay_seconds)
                continue
            # All retries exhausted - log exact error and stop startup
            logger.exception("Failed to connect to MongoDB Atlas after %s attempts: %s", max_retries, e)
            print(f"Failed to connect to MongoDB Atlas after {max_retries} attempts: {e}")
            raise SystemExit(e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )