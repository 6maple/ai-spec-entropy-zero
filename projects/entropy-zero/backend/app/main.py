"""
Entropy Zero Backend API

FastAPI application for Entropy Zero Phase 1.
Handles knowledge ingestion, note management, and flashcard reviews.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import raw_knowledge, notes, cards

app = FastAPI(
    title="Entropy Zero API",
    description="Backend API for Entropy Zero - Phase 1",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(raw_knowledge.router, prefix="/api/raw", tags=["Raw Knowledge"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(cards.router, prefix="/api/cards", tags=["Flashcards"])


@app.get("/")
async def root():
    return {
        "message": "Entropy Zero API - Phase 1",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
