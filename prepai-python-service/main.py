from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import os
import shutil
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    video_path = f"temp_{int(time.time())}_{file.filename}"
    logger.info(f"Received file for analysis: {file.filename}")
    
    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error("Could not open video file")
            raise HTTPException(status_code=400, detail="Could not open video file")

        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames_metadata = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        
        logger.info(f"Metadata: FPS={fps}, Total Frames={total_frames_metadata}")

        # WebM files often have invalid metadata. We will count frames manually.
        emotions_tally = {
            "angry": 0, "disgust": 0, "fear": 0, 
            "happy": 0, "sad": 0, "surprise": 0, "neutral": 0
        }

        actual_frame_count = 0
        analyzed_count = 0
        
        # We'll try to analyze 1 frame per second. 
        # If FPS is invalid, we'll assume 30.
        sampling_rate = int(fps) if fps > 0 else 30
        if sampling_rate <= 0: sampling_rate = 30

        start_time = time.time()
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if actual_frame_count % sampling_rate == 0:
                try:
                    # analyze frame
                    result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False, silent=True)
                    if isinstance(result, list):
                        result = result[0]
                    
                    top_emotion = result['dominant_emotion']
                    emotions_tally[top_emotion] += 1
                    analyzed_count += 1
                except Exception as e:
                    # logger.warning(f"Analysis error at frame {actual_frame_count}: {str(e)}")
                    pass
            
            actual_frame_count += 1
            
            # Safety timeout: if processing takes more than 5 minutes (increased for better stability)
            if time.time() - start_time > 300:
                logger.warning("Analysis timeout reached")
                break

        cap.release()
        
        if os.path.exists(video_path):
            os.remove(video_path)
        
        # Calculate duration based on actual frames read
        calculated_seconds = int(actual_frame_count / sampling_rate) if sampling_rate > 0 else 0
        
        if analyzed_count > 0:
            dominant_emotion = max(emotions_tally, key=emotions_tally.get)
        else:
            dominant_emotion = "neutral"

        logger.info(f"Analysis finished. Frames read: {actual_frame_count}, Analyzed: {analyzed_count}, Calc Seconds: {calculated_seconds}")

        return {
            "dominant_emotion": dominant_emotion,
            "emotion_breakdown": emotions_tally,
            "total_seconds_analyzed": calculated_seconds,
            "frames_analyzed": analyzed_count,
            "total_frames_read": actual_frame_count
        }
    except Exception as e:
        logger.error(f"Global error in analysis: {str(e)}")
        if os.path.exists(video_path):
            os.remove(video_path)
        raise HTTPException(status_code=500, detail=str(e))
