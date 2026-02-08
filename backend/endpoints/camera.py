from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.camera_service import camera_service
import time

router = APIRouter()

class VideoSource(BaseModel):
    source: str

def generate_frames():
    while True:
        frame = camera_service.get_latest_frame()
        if frame is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            pass
        
        time.sleep(0.04)

@router.get("/camera/stream")
async def video_feed():
    """
    Stream video from the drone camera using MJPEG.
    """
    if not camera_service.running:
        camera_service.start()
        
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.post("/camera/source")
async def set_video_source(source_data: VideoSource):
    """
    Set the video source ('drone' or 'local').
    """
    try:
        camera_service.set_video_source(source_data.source)
        return {"status": "success", "source": source_data.source}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/camera/source")
async def get_video_source():
    """
    Get the current video source.
    """
    return {"source": camera_service.get_video_source()}

