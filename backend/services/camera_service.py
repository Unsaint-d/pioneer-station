import threading
import time
import cv2
import numpy as np
from pioneer_sdk.camera import Camera
from processors.manager import plugin_manager

class CameraService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(CameraService, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.current_frame = None
        self.running = False
        self.thread = None
        self.video_source = 'drone'
        self.webcam = None
        self.camera = None
        
        self._initialized = True

    def set_video_source(self, source: str):
        """Set the video source ('drone' or 'local')."""
        if source not in ['drone', 'local']:
            raise ValueError("Invalid source. Must be 'drone' or 'local'")
        
        with self._lock:
            self.video_source = source
            if source == 'drone':
                if self.webcam:
                    self.webcam.release()
                    self.webcam = None
        print(f"Video source switched to {source}")

    def get_video_source(self):
        """Get the current video source."""
        return self.video_source

    def start(self):
        """Start the video capture thread."""
        if self.running:
            return
            
        if self.video_source == 'drone' and self.camera is None:
            self.camera = Camera()
            
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        print("Camera service started")

    def stop(self):
        """Stop the video capture thread."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        
        if self.camera:
            self.camera.disconnect()
            self.camera = None
            
        if self.webcam:
            self.webcam.release()
            self.webcam = None
        print("Camera service stopped")

    def _capture_loop(self):
        """Continuously capture frames from the drone camera or local webcam."""
        while self.running:
            try:
                frame = None
                
                if self.video_source == 'drone':
                    if self.camera is None:
                        try:
                            self.camera = Camera()
                        except Exception as e:
                            print(f"Failed to connect to drone camera: {e}")
                            time.sleep(1)
                            continue
                            
                    frame = self.camera.get_cv_frame()
                elif self.video_source == 'local':
                    if self.webcam is None or not self.webcam.isOpened():
                        self.webcam = cv2.VideoCapture(0)
                        if not self.webcam.isOpened():
                            print("Failed to open local webcam")
                            time.sleep(1)
                            continue
                    
                    ret, cam_frame = self.webcam.read()
                    if ret:
                        frame = cam_frame
                    else:
                        print("Failed to read from webcam")
                        self.webcam.release()
                        self.webcam = None
                        time.sleep(1)

                if frame is not None:
                    processed_frame = plugin_manager.process_frame(frame)
                    
                    ret, buffer = cv2.imencode('.jpg', processed_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                    
                    if ret:
                        self.current_frame = buffer.tobytes()
                else:
                    time.sleep(0.01)
            except Exception as e:
                time.sleep(1)

    def get_latest_frame(self):
        """Return the latest captured frame."""
        return self.current_frame

camera_service = CameraService()
