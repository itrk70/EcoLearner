"""
app.py
======
The Flask backend for EcoLearner.

Run this with:  python app.py   (from inside the backend/ folder)
Then visit:     http://127.0.0.1:5000/
"""

import os
import re
import sys
import random
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, session, send_from_directory, redirect
from dotenv import load_dotenv

# Loads variables from a ".env" file (in this backend/ folder) into
# os.environ, so os.environ.get("MAIL_USERNAME") etc. below actually
# find something. This must run BEFORE we read any os.environ values.
load_dotenv()

# ==========================================================================
# STEP 1: Make db_helpers.py importable.
#
# db_helpers.py lives in ../database/ relative to this file (backend/).
# Python doesn't automatically look there, so we add that folder to
# Python's search path (sys.path) before importing it.
# ==========================================================================
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))          # .../backend
PROJECT_ROOT = os.path.join(BACKEND_DIR, "..")                     # .../itrk70-ecolearner
DATABASE_DIR = os.path.join(PROJECT_ROOT, "database")               # .../database
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")               # .../frontend

sys.path.append(DATABASE_DIR)
import db_helpers  # now importable because of the sys.path.append above


# ==========================================================================
# STEP 2: Create the Flask app.
#
# static_folder='../frontend' + static_url_path='' means: Flask will
# automatically serve EVERYTHING inside frontend/ at the matching URL,
# with no extra routes needed. For example:
#   frontend/css/global.css     ->  http://.../css/global.css
#   frontend/js/signup.js       ->  http://.../js/signup.js
#   frontend/html/login.html    ->  http://.../html/login.html
#
# This matters because your HTML files use relative paths like
# "../css/global.css" and "../js/signup.js" - those only resolve
# correctly if login.html is actually served FROM inside an /html/
# URL folder, which this setup does automatically.
# ==========================================================================
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

# The secret key is what Flask uses to cryptographically sign session
# cookies, so a user can't forge/edit their own session data. In a real
# deployed app this should come from an environment variable, not be
# hardcoded - for local hackathon development this is fine.
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key-change-this-later")


# ==========================================================================
# STEP 3: Serve the root page.
#
# index.html sits at the PROJECT ROOT (one level above both backend/ and
# frontend/), not inside frontend/, so the static_folder setup above
# doesn't cover it - we add one explicit route for it.
# ==========================================================================
@app.route("/")
def serve_root_index():
    return send_from_directory(PROJECT_ROOT, "index.html")


# ==========================================================================
# HELPERS shared across routes
# ==========================================================================

# Same character set signup.js / login.js / forgot-password.js use in
# their regex, so backend and frontend always agree on what's "valid".
def is_password_valid(password):
    if not password or not (8 <= len(password) <= 20):
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=]', password):
        return False
    return True


def login_required(route_function):
    """
    A DECORATOR - a function that wraps another function to add behavior
    before it runs. Put @login_required above any route that should only
    work for a logged-in user. It checks session for a user_id BEFORE
    the actual route code runs; if there isn't one, it stops immediately
    and sends back a 401 (Unauthorized) instead of running the route.
    """
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "message": "Not logged in."}), 401
        return route_function(*args, **kwargs)
    return wrapper


# ==========================================================================
# PHASE 1 - SIGNUP / LOGIN / LOGOUT
# ==========================================================================

@app.route("/signup", methods=["POST"])
def signup():
    """
    Matches the contract in signup.js exactly:
      Request:  { fullName, username, email, password }
      Success:  { "success": true,  "message": "..." }
      Failure:  { "success": false, "message": "..." }
    """
    data = request.get_json(silent=True) or {}

    full_name = (data.get("fullName") or "").strip()
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Basic server-side validation - never trust the browser alone,
    # since anyone can call this route directly with curl/Postman and
    # skip the frontend's own checks entirely.
    if not full_name or not username or not email:
        return jsonify({"success": False, "message": "All fields are required."}), 400

    if not is_password_valid(password):
        return jsonify({
            "success": False,
            "message": "Password must be 8-20 characters and include uppercase, lowercase, a number, and a special character."
        }), 400

    try:
        db_helpers.create_user(full_name=full_name, username=username, email=email, password=password)
    except sqlite3.IntegrityError:
        # This fires because of the UNIQUE constraints on username/email
        # in schema.sql - it means one of them is already taken.
        return jsonify({"success": False, "message": "Username or email is already taken."}), 409

    return jsonify({"success": True, "message": "Account created! You can now log in."})


@app.route("/login", methods=["POST"])
def login():
    """
    Request:  { identifier, password }   (identifier = email OR username)
    Success:  { "success": true,  "message": "..." }
    Failure:  { "success": false, "message": "..." }

    On success, we store user_id in the Flask session. Flask signs this
    session data and sends it to the browser as a cookie; the browser
    automatically sends that cookie back on every future request, which
    is how /profile and /quiz/use-hint later know WHO is asking, without
    the frontend ever having to say "user 42" out loud.
    """
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"success": False, "message": "Please enter your email/username and password."}), 400

    # Could be an email or a username - try email first, then username.
    user = db_helpers.get_user_by_email(identifier.lower())
    if user is None:
        user = db_helpers.get_user_by_username(identifier)

    if user is None:
        return jsonify({"success": False, "message": "No account found with that email/username."}), 401

    if user["password_hash"] is None:
        # This account was created via Google/Microsoft sign-in and has
        # no password to check against.
        return jsonify({"success": False, "message": "This account uses Google/Microsoft sign-in. Please use that instead."}), 401

    from werkzeug.security import check_password_hash
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "message": "Incorrect password."}), 401

    # Correct! Log them in by saving their id in the session.
    session["user_id"] = user["id"]

    return jsonify({"success": True, "message": "Logged in successfully."})


@app.route("/logout", methods=["POST"])
def logout():
    """Wipes the whole session, so user_id (and anything else stored
    in it) is gone - the browser's cookie becomes meaningless."""
    session.clear()
    return jsonify({"success": True, "message": "Logged out."})


# ==========================================================================
# PHASE 2 - FORGOT PASSWORD (email OTP flow)
# ==========================================================================
#
# Uses Flask-Mail to actually send email. Settings come from environment
# variables (see .env.example in this folder) - NEVER hardcode the app
# password directly in this file, since this project is a public repo.

from flask_mail import Mail, Message

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("MAIL_USERNAME")

mail = Mail(app)

OTP_EXPIRY_MINUTES = 10  # OTP codes older than this are rejected


def _otp_is_expired(otp_created_at_str):
    """otp_created_at is stored by SQLite as 'YYYY-MM-DD HH:MM:SS' (UTC,
    from CURRENT_TIMESTAMP). Returns True if more than OTP_EXPIRY_MINUTES
    have passed since then."""
    if not otp_created_at_str:
        return True
    created_at = datetime.strptime(otp_created_at_str, "%Y-%m-%d %H:%M:%S")
    return datetime.utcnow() - created_at > timedelta(minutes=OTP_EXPIRY_MINUTES)


@app.route("/forgot-password/send-otp", methods=["POST"])
def forgot_password_send_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    user = db_helpers.get_user_by_email(email)
    if user is None:
        return jsonify({"success": False, "message": "No account exists with this email address."})

    otp_code = str(random.randint(100000, 999999))
    db_helpers.set_otp(user["id"], otp_code)

    try:
        message = Message(
            subject="Your EcoLearner password reset code",
            recipients=[email],
            body=(
                f"Hi {user['full_name']},\n\n"
                f"Your EcoLearner password reset code is: {otp_code}\n"
                f"This code expires in {OTP_EXPIRY_MINUTES} minutes.\n\n"
                f"If you didn't request this, you can safely ignore this email."
            ),
        )
        mail.send(message)
    except Exception as error:
        # If email sending fails (e.g. MAIL_USERNAME/PASSWORD not set up
        # yet), don't lie and say it worked - tell the truth so it's
        # obvious during setup/testing that email isn't configured yet.
        print("Failed to send OTP email:", error)
        return jsonify({"success": False, "message": "Could not send the email right now. Please try again shortly."})

    return jsonify({"success": True, "message": "OTP sent to your email."})


@app.route("/forgot-password/verify-otp", methods=["POST"])
def forgot_password_verify_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    submitted_otp = (data.get("otp") or "").strip()

    user = db_helpers.get_user_by_email(email)
    if user is None or user["otp_code"] is None:
        return jsonify({"success": False, "message": "Invalid or expired OTP."})

    if _otp_is_expired(user["otp_created_at"]):
        return jsonify({"success": False, "message": "Invalid or expired OTP."})

    if submitted_otp != user["otp_code"]:
        return jsonify({"success": False, "message": "Invalid or expired OTP."})

    return jsonify({"success": True})


@app.route("/forgot-password/reset", methods=["POST"])
def forgot_password_reset():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    submitted_otp = (data.get("otp") or "").strip()
    new_password = data.get("newPassword") or ""

    user = db_helpers.get_user_by_email(email)
    if user is None or user["otp_code"] is None:
        return jsonify({"success": False, "message": "Invalid or expired OTP. Please start over."})

    # Re-check the OTP here too, exactly like verify-otp did - this route
    # could theoretically be called on its own, so it must not assume
    # verify-otp already ran successfully.
    if _otp_is_expired(user["otp_created_at"]) or submitted_otp != user["otp_code"]:
        return jsonify({"success": False, "message": "Invalid or expired OTP. Please start over."})

    if not is_password_valid(new_password):
        return jsonify({
            "success": False,
            "message": "Password must be 8-20 characters and include uppercase, lowercase, a number, and a special character."
        })

    db_helpers.update_password(user["id"], new_password)
    db_helpers.clear_otp(user["id"])  # the code is now used up - block reuse

    return jsonify({"success": True})


# ==========================================================================
# PHASE 3 - PROFILE DATA
# ==========================================================================

@app.route("/profile", methods=["GET"])
@login_required
def profile():
    """
    Returns get_profile_data() for whoever is logged in, straight from
    the session (never from a URL parameter like /profile?user_id=5 -
    that would let anyone view anyone else's data just by changing a
    number in the URL).
    """
    user_id = session["user_id"]
    try:
        data = db_helpers.get_profile_data(user_id)
    except ValueError:
        # Their account no longer exists (e.g. deleted) but they still
        # have an old session cookie - clear it so they don't get stuck.
        session.clear()
        return jsonify({"success": False, "message": "User not found."}), 404

    return jsonify(data)


# ==========================================================================
# PHASE 4 - QUIZ HINT SPENDING
# ==========================================================================

HINT_COST = 20  # fixed on the backend - never trust a cost sent by the browser

@app.route("/quiz/use-hint", methods=["POST"])
@login_required
def use_hint():
    user_id = session["user_id"]
    try:
        new_balance = db_helpers.spend_coins(user_id, HINT_COST)
    except ValueError:
        return jsonify({"success": False, "message": "Not enough coins"})

    return jsonify({"success": True, "newCoinBalance": new_balance})


# ==========================================================================
# PHASE 5 - GOOGLE LOGIN (Authlib) - see NOTES_FOR_PRESENTATION.md for
# the Google Cloud Console setup steps you need to do BEFORE this works.
# Wrapped in a try/except so the rest of the app still runs even if
# Authlib isn't installed yet or the .env values aren't filled in.
# ==========================================================================

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    from authlib.integrations.flask_client import OAuth

    oauth = OAuth(app)
    google = oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

    @app.route("/auth/google/login")
    def google_login():
        redirect_uri = "http://127.0.0.1:5000/auth/google/callback"
        return google.authorize_redirect(redirect_uri)

    @app.route("/auth/google/callback")
    def google_callback():
        token = google.authorize_access_token()
        user_info = token["userinfo"]  # has sub (google id), email, name

        google_id = user_info["sub"]
        email = user_info["email"].lower()
        full_name = user_info.get("name", email)

        # Returning user? Their google_id was already saved before.
        connection = db_helpers.get_connection()
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT * FROM Users WHERE google_id = ?", (google_id,))
            user = cursor.fetchone()
        finally:
            connection.close()

        if user is None:
            # First time signing in with this Google account - create a
            # new account. If they'd already signed up the normal way
            # with this same email, create_user() will raise
            # IntegrityError (email UNIQUE) - handle that by just
            # linking google_id onto the existing account instead.
            try:
                new_id = db_helpers.create_user(
                    full_name=full_name, username=email.split("@")[0],
                    email=email, google_id=google_id,
                )
                user_id = new_id
            except sqlite3.IntegrityError:
                existing = db_helpers.get_user_by_email(email)
                connection = db_helpers.get_connection()
                try:
                    connection.execute("UPDATE Users SET google_id = ? WHERE id = ?", (google_id, existing["id"]))
                    connection.commit()
                finally:
                    connection.close()
                user_id = existing["id"]
        else:
            user_id = user["id"]

        session["user_id"] = user_id
        return redirect("/html/profile.html")


# ==========================================================================
# RUN THE APP
# ==========================================================================
if __name__ == "__main__":
    # debug=True auto-reloads the server when you save this file, and
    # shows detailed error pages while developing. Turn this OFF before
    # ever deploying this somewhere public.
    app.run(debug=True, port=5000)
