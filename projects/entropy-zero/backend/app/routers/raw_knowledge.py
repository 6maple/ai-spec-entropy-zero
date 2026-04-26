"""
Raw Knowledge Router

Endpoints for managing raw knowledge files (Markdown uploads)
"""

from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models.schemas import RawKnowledgeCreate, RawKnowledgeResponse

router = APIRouter()


@router.post(
    "/", response_model=RawKnowledgeResponse, status_code=status.HTTP_201_CREATED
)
async def create_raw_knowledge(data: RawKnowledgeCreate):
    """
    Upload a new raw knowledge file (Markdown)

    TODO: Implement file upload to Supabase Storage
    TODO: Create database record
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Raw knowledge creation not yet implemented",
    )


@router.get("/", response_model=List[RawKnowledgeResponse])
async def list_raw_knowledge(
    status_filter: str = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    List all raw knowledge files

    TODO: Query Supabase with pagination
    TODO: Apply status filter if provided
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Raw knowledge listing not yet implemented",
    )


@router.get("/{raw_id}", response_model=RawKnowledgeResponse)
async def get_raw_knowledge(raw_id: str):
    """
    Get a specific raw knowledge file by ID

    TODO: Query Supabase by raw_id
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Raw knowledge retrieval not yet implemented",
    )


@router.post("/{raw_id}/process")
async def trigger_processing(raw_id: str):
    """
    Trigger AI processing for a raw knowledge file

    TODO: Enqueue task to Upstash Redis
    TODO: Call AI service to generate notes and flashcards
    """
    # TODO: Validate raw_id exists and is in 'pending' status
    # TODO: Enqueue task: await redis_client.lpush('process_queue', raw_id)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="AI processing trigger not yet implemented",
    )


@router.delete("/{raw_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_raw_knowledge(raw_id: str):
    """
    Delete a raw knowledge file

    TODO: Delete from Supabase (will cascade to notes and flashcards via RLS)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Raw knowledge deletion not yet implemented",
    )
