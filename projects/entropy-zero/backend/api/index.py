"""
Vercel Functions Entry Point

This file adapts the FastAPI app to work with Vercel's serverless functions.
"""

from mangum import Mangum
from app.main import app

# Mangum handler for AWS Lambda / Vercel Functions
handler = Mangum(app, lifespan="off")
