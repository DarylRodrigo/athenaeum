from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/spaces", tags=["spaces"])


@router.get("")
def list_spaces(request: Request):
    config = request.app.state.config
    return [
        {"id": s.id, "label": s.label, "accent": s.accent}
        for s in config.spaces
    ]
