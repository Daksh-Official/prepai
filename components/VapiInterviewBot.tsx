"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  FiPhoneCall, FiPhoneOff, FiMic, FiMicOff,
  FiCheckCircle, FiAlertCircle, FiInfo, FiCamera,
  FiVolumeX, FiVolume2
} from "react-icons/fi";
import { useRouter } from "next/navigation";

interface VapiInterviewBotProps {
  interviewPrompt?: string;
  interviewType?: string;
}

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBot({ interviewType, interviewPrompt }: VapiInterviewBotProps) {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Ready to Start");
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const router = useRouter();

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  const handleCallEnd = useCallback(() => {
    setIsCallActive(false);
    setIsLoading(false);
    setIsBotSpeaking(false);
    setStatusMessage("Interview Ended.");

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (localVideoRef.current && localVideoRef.current.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setErrorMessage("Vapi Public Key missing.");
      return;
    }

    if (!vapiRef.current) {
      vapiRef.current = new Vapi(publicKey);
    }
    const vapi = vapiRef.current;

    const handleCallStart = () => {
      setIsCallActive(true);
      setIsLoading(false);
      setErrorMessage(null);
      setStatusMessage("Interview Active");
    };

    const handleError = (e: Error) => {
      setIsLoading(false);
      setErrorMessage("Connection error. Check logs.");
      setIsBotSpeaking(false);
    };

    const handleSpeechStart = () => {
      setIsBotSpeaking(true);
      if (isCallActiveRef.current) setStatusMessage("AI is speaking...");
    };

    const handleSpeechEnd = () => {
      setIsBotSpeaking(false);
      if (isCallActiveRef.current) setStatusMessage("Listening...");
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("error", handleError);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);

    return () => {
      if (vapiRef.current) {
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("error", handleError);
        vapi.off("speech-start", handleSpeechStart);
        vapi.off("speech-end", handleSpeechEnd);
        if (isCallActiveRef.current) vapiRef.current.stop();
      }
    };
  }, [handleCallEnd]);

  const handleVideoProcessing = async (videoBlob: Blob) => {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;
    const nextFormData = new FormData();
    nextFormData.append('file', videoBlob, 'practice-interview.webm');
    nextFormData.append('userId', userId);

    try {
      setStatusMessage("Processing session...");
      const nextResponse = await fetch('/api/upload', {
        method: 'POST',
        body: nextFormData
      });

      if (!nextResponse.ok) throw new Error("Video upload failed");

      const nextData = await nextResponse.json();

      if (nextData.success) {
        const secureFileName = nextData.filename;

        const pythonFormData = new FormData();
        pythonFormData.append('file', videoBlob, 'interview.webm');

        try {
          const pythonResponse = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            body: pythonFormData
          });

          const aiResult = await pythonResponse.json();

          await addDoc(collection(db, 'users', userId, 'behavioral_reports'), {
            userId: userId,
            jobId: `practice-${interviewType || "unknown"}`,
            videoFileName: secureFileName,
            sentimentData: aiResult,
            createdAt: serverTimestamp()
          });

          setStatusMessage("Session saved! View your report below.");
          setProcessingComplete(true);
        } catch (pyError: any) {
          console.error("Analysis Failed:", pyError);
          // Save partial report anyway
          await addDoc(collection(db, 'users', userId, 'behavioral_reports'), {
            userId: userId,
            jobId: `practice-${interviewType || "unknown"}`,
            videoFileName: secureFileName,
            sentimentData: { error: "Analysis failed", details: pyError.message },
            createdAt: serverTimestamp()
          });
          setProcessingComplete(true);
        }
      }
    } catch (error: any) {
      console.error("Video Processing Error:", error);
      setErrorMessage("Failed to process session.");
    }
  };

  const handleStartCall = async () => {
    if (!vapiRef.current) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Initializing...");

    let fetchedResumeText = "";
    try {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().resumeText) {
          fetchedResumeText = userSnap.data().resumeText;
        }
      }
    } catch (error) {
      console.error("Resume fetch failed");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        await handleVideoProcessing(videoBlob);
      };

      mediaRecorder.start();

      const dynamicPrompt = `${interviewPrompt || "Conduct a professional technical interview."}
      
      Strict Rules:
      1. Ask one question at a time.
      2. Base questions on the resume below if relevant.
      
      --- CANDIDATE RESUME ---
      ${fetchedResumeText || "Not provided."}`;

      const assistantOverrides = {
        firstMessage: `Welcome to your ${interviewType || "Mock"} interview! Let's get started. Please introduce yourself.`,
        model: {
          provider: "openai" as const,
          model: "gpt-4o" as const,
          messages: [
            {
              role: "system" as const,
              content: dynamicPrompt,
            },
          ],
        },
      };

      await vapiRef.current.start("18c8a0a3-bc06-408a-b176-dca79d3c16af", assistantOverrides);

    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(`Failed: ${error.message}`);
      setStatusMessage("Failed");
    }
  };

  const handleStopCall = () => {
    if (!vapiRef.current) return;
    setIsLoading(true);
    setStatusMessage("Ending...");
    vapiRef.current.stop();
  };

  const handleToggleMute = () => {
    if (!vapiRef.current) return;
    const currentlyMuted = vapiRef.current.isMuted();
    vapiRef.current.setMuted(!currentlyMuted);
    setIsMuted(!currentlyMuted);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center w-full min-h-[70vh] p-6 space-y-6 md:space-y-0 md:space-x-8 bg-[#05050A] rounded-2xl border border-gray-800 shadow-2xl">

      <div className="flex flex-col items-center justify-center p-6 w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-2">{interviewType || "Practice"}</h2>
        <p className="text-gray-400 text-sm mb-8 text-center">AI-Powered Practice Session</p>

        <div className={`w-48 h-48 rounded-full overflow-hidden border-4 border-[#4A3AFF] shadow-[0_0_30px_rgba(74,58,255,0.2)] flex items-center justify-center mb-8 transform transition-all duration-500
          ${isBotSpeaking ? 'ring-4 ring-purple-500 ring-opacity-75 scale-105 shadow-[0_0_50px_rgba(178,85,255,0.6)]' : 'hover:scale-[1.01]'}`}>
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex items-center justify-center">
            <span className="text-4xl">🤖</span>
          </div>
        </div>

        <div className={`text-sm font-medium px-4 py-2 rounded-full border flex items-center justify-center text-center
          ${errorMessage ? 'text-red-400 bg-red-900/30 border-red-800' :
            isCallActive ? (isMuted ? 'text-orange-400 bg-orange-900/30 border-orange-800' : (isBotSpeaking ? 'text-purple-400 bg-purple-900/30 border-purple-800' : 'text-green-400 bg-green-900/30 border-green-800')) :
              'text-blue-400 bg-blue-900/30 border-blue-800'
          }`}>
          {errorMessage ? <FiAlertCircle className="w-4 h-4 mr-2" /> :
            isMuted && isCallActive ? <FiVolumeX className="w-4 h-4 mr-2" /> :
              isBotSpeaking && isCallActive ? <FiVolume2 className="w-4 h-4 mr-2" /> :
                isCallActive ? <FiCheckCircle className="w-4 h-4 mr-2" /> :
                  <FiInfo className="w-4 h-4 mr-2" />}
          {statusMessage}
        </div>
      </div>

      <div className="flex flex-col items-center justify-between p-6 w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 h-full">
        <div className="w-full aspect-[4/3] bg-black rounded-xl overflow-hidden relative border border-gray-700 shadow-inner flex items-center justify-center mb-6">
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"></video>
          {!isCallActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-gray-400">
              <FiCamera className="w-12 h-12 mb-2 opacity-50" />
              <p>Camera Preview</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-4 w-full">
          {processingComplete ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg transform hover:scale-105"
            >
              <FiCheckCircle className="mr-2" /> View Reports in Dashboard
            </button>
          ) : !isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading}
              className={`flex items-center justify-center w-full py-4 rounded-xl text-white font-bold transition-all transform hover:scale-105 shadow-lg
                ${isLoading ? "bg-gray-600 cursor-not-allowed" : "bg-[#4A3AFF] hover:bg-[#6357FF]"}`}
            >
              {isLoading ? "Starting..." : "Start Interview"}
            </button>
          ) : (
            <div className="flex space-x-4 justify-center w-full">
              <button
                onClick={handleToggleMute}
                className={`flex items-center justify-center w-14 h-14 rounded-full text-white text-xl transition-all
                  ${isMuted ? "bg-orange-500 hover:bg-orange-400" : "bg-gray-700 hover:bg-gray-600"}`}
              >
                {isMuted ? <FiMicOff /> : <FiMic />}
              </button>

              <button
                onClick={handleStopCall}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white text-2xl transition-all shadow-lg"
              >
                <FiPhoneOff />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}