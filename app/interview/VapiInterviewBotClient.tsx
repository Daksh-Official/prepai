"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { saveInterviewCallId } from "@/app/services/firestoreUser";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Info,
  Camera,
  VolumeX,
  Volume2,
  Circle,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBotClient() {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [isScanningResume, setIsScanningResume] = useState<boolean>(true);
  const [isBotSpeaking, setIsBotSpeaking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [hasInterviewBeenTaken, setHasInterviewBeenTaken] = useState<boolean>(false);
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const currentCallIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const jobIdFromParams = searchParams.get('jobId');
    if (jobIdFromParams) {
      setCurrentJobId(jobIdFromParams);
    }
  }, [searchParams]);

  const handleVideoProcessing = async (videoBlob: Blob) => {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;
    const nextFormData = new FormData();

    nextFormData.append('file', videoBlob, `interview_${Date.now()}.webm`);
    nextFormData.append('userId', userId);

    try {
      setStatusMessage("Archiving session...");
      const nextResponse = await fetch('/api/upload', {
        method: 'POST',
        body: nextFormData
      });

      if (!nextResponse.ok) throw new Error("Upload failed");

      const nextData = await nextResponse.json();

      if (nextData.success) {
        const secureFileName = nextData.filename;

        setStatusMessage("Analyzing response...");
        const pythonFormData = new FormData();
        pythonFormData.append('file', videoBlob, 'interview.webm');

        let isServiceUp = false;
        try {
          const healthRes = await fetch('http://127.0.0.1:8000/health', { method: 'GET' });
          if (healthRes.ok) isServiceUp = true;
        } catch (e) {
          console.warn("Analysis service unreachable");
        }

        if (!isServiceUp) throw new Error("Analysis service offline");

        try {
          const pythonResponse = await fetch('http://127.0.0.1:8000/analyze', {
            method: 'POST',
            body: pythonFormData
          });

          if (!pythonResponse.ok) throw new Error("Analysis failed");

          const aiResult = await pythonResponse.json();

          await addDoc(collection(db, 'users', userId, 'behavioral_reports'), {
            userId: userId,
            jobId: currentJobId,
            videoFileName: secureFileName,
            sentimentData: aiResult,
            createdAt: serverTimestamp()
          });

          setStatusMessage("Session synchronized.");
          setProcessingComplete(true);
        } catch (pyError: any) {
          await addDoc(collection(db, 'users', userId, 'behavioral_reports'), {
            userId: userId,
            jobId: currentJobId,
            videoFileName: secureFileName,
            sentimentData: { error: "Analysis failed", details: pyError.message },
            createdAt: serverTimestamp()
          });
          setProcessingComplete(true);
        }
      }
    } catch (error: any) {
      setErrorMessage(`Processing error: ${error.message}`);
    }
  };

  const handleCallEnd = useCallback(async () => {
    setIsCallActive(false);
    setIsLoading(false);
    setIsBotSpeaking(false);
    setStatusMessage("Session terminated.");

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (e) { }

    try {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => {
          try { track.stop(); } catch (err) { }
        });
        localVideoRef.current.srcObject = null;
      }
    } catch (e) { }

    const callIdAtEnd = currentCallIdRef.current;

    if (callIdAtEnd && currentJobId) {
      try {
        await saveInterviewCallId(callIdAtEnd, currentJobId);
        setHasInterviewBeenTaken(true);
      } catch (error: any) {
      } finally {
        currentCallIdRef.current = null;
      }
    } else {
      currentCallIdRef.current = null;
    }
  }, [currentJobId]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    if (!publicKey) return;

    if (!vapiRef.current) {
      vapiRef.current = new Vapi(publicKey);
    }
    const vapi = vapiRef.current;

    const handleCallStart = () => {
      setIsCallActive(true);
      setIsLoading(false);
      setErrorMessage(null);
      setStatusMessage("Live Signal Active");
    };

    const handleError = (e: Error) => {
      setIsLoading(false);
      setErrorMessage(e.message);
      currentCallIdRef.current = null;
      setIsBotSpeaking(false);
    };

    const handleSpeechStart = () => {
      setIsBotSpeaking(true);
      if (isCallActiveRef.current) setStatusMessage("Interviewer Speaking");
    };

    const handleSpeechEnd = () => {
      setIsBotSpeaking(false);
      if (isCallActiveRef.current) setStatusMessage("Monitoring Input");
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
        currentCallIdRef.current = null;
      }
    };
  }, [handleCallEnd, isMuted]);

  useEffect(() => {
    if (!currentJobId) {
      setIsScanningResume(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setIsScanningResume(false);
        return;
      }

      const fetchData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            setResumeContent(userData.resumeText || null);

            const isPracticeMode = currentJobId === 'general_swe';
            if (!isPracticeMode && userData.appliedJobs?.[currentJobId]?.interviewTaken) {
              setHasInterviewBeenTaken(true);
              setStatusMessage("Archive exists");
            } else {
              setHasInterviewBeenTaken(false);
              setStatusMessage("System Ready");
            }
          }
        } catch (error) {
        } finally {
          setIsScanningResume(false);
        }
      };
      fetchData();
    });

    return () => unsubscribe();
  }, [currentJobId]);

  const interviewAssistantConfig = useCallback(
    (): CreateAssistantDTO => ({
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `Professional AI interviewer.
            
            Guidelines:
            1. Warm welcome.
            2. Resume-centric questions.
            3. One question at a time.
            4. Wait for candidate response.
            5. No interruptions.
            
            Resume:
            ${resumeContent || "General engineering context."}
            `,
          },
        ],
      },
      voice: {
        provider: "azure",
        voiceId: "en-US-JennyNeural",
      },
      name: "Nexus AI",
      firstMessage: "Hello. I am Nexus AI. Let's begin the technical assessment. Please introduce yourself.",
    }),
    [resumeContent]
  );

  const handleStartCall = async () => {
    if (!vapiRef.current || isScanningResume || !currentJobId || hasInterviewBeenTaken) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Calibrating...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        await handleVideoProcessing(blob);
      };

      mediaRecorder.start();

      await new Promise(resolve => setTimeout(resolve, 500));

      const call = await vapiRef.current.start(interviewAssistantConfig());

      if (call?.id) {
        currentCallIdRef.current = call.id;
        setIsCallActive(true);
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message);
    }
  };

  const handleStopCall = () => {
    if (!vapiRef.current) return;
    setIsLoading(true);
    setStatusMessage("Disconnecting...");
    vapiRef.current.stop();
  };

  const handleToggleMute = () => {
    if (!vapiRef.current) return;
    const currentlyMuted = vapiRef.current.isMuted();
    vapiRef.current.setMuted(!currentlyMuted);
    setIsMuted(!currentlyMuted);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">

        <div className="lg:col-span-4 space-y-8">
          <div>
            <h2 className="text-xs font-bold leading-7 text-zinc-400 uppercase tracking-[0.3em] mb-2">Interview Room</h2>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Nexus AI</h1>
            <p className="mt-2 text-sm text-zinc-500">Technical Assessment Module</p>
          </div>

          <div className="relative aspect-square w-full max-w-[240px] mx-auto lg:mx-0 rounded-2xl border border-zinc-100 bg-white p-1 shadow-sm overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#f4f4f5_0%,transparent_100%)]" />
            <div className="relative h-full w-full rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
              <img
                src="/images/bot.jpg"
                alt="AI"
                className={`h-full w-full object-cover rounded-xl transition-all duration-700 ${isBotSpeaking ? 'scale-105 opacity-100' : 'opacity-80 grayscale-[50%]'}`}
              />
              <AnimatePresence>
                {isBotSpeaking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 flex gap-1.5"
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [4, 12, 4] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1 bg-white rounded-full"
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-medium">
              <div className={`h-2 w-2 rounded-full ${errorMessage ? 'bg-red-500' :
                  isCallActive ? 'bg-zinc-900 animate-pulse' : 'bg-zinc-200'
                }`} />
              <span className={errorMessage ? 'text-red-600' : 'text-zinc-600'}>
                {errorMessage || statusMessage || "System Idle"}
              </span>
            </div>
            {errorMessage && (
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-semibold text-zinc-900 border-b border-zinc-900 pb-0.5"
              >
                Reset Connection
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="relative aspect-video w-full rounded-2xl border border-zinc-200 bg-zinc-950 shadow-2xl overflow-hidden ring-1 ring-zinc-900/5">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover scale-x-[-1] opacity-90 transition-opacity duration-700"
            />

            {!isCallActive && !processingComplete && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/40 backdrop-blur-[2px]">
                <Camera size={40} className="text-white/20 mb-4" strokeWidth={1} />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Camera Ready</p>
              </div>
            )}

            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="flex h-6 items-center gap-2 rounded-full bg-zinc-950/50 px-2.5 backdrop-blur-md border border-white/10">
                <div className={`h-1.5 w-1.5 rounded-full ${isCallActive ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                  {isCallActive ? 'Recording' : 'Standby'}
                </span>
              </div>
            </div>

            <div className="absolute bottom-6 inset-x-6 flex justify-center">
              <div className="flex h-16 items-center gap-4 rounded-2xl bg-zinc-950/80 px-6 backdrop-blur-xl border border-white/10 shadow-2xl">
                {processingComplete ? (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-sm font-bold text-white transition-colors hover:text-zinc-300"
                  >
                    <CheckCircle2 size={18} />
                    View Assessment
                    <ArrowRight size={14} />
                  </button>
                ) : !isCallActive ? (
                  <button
                    onClick={handleStartCall}
                    disabled={isLoading || isScanningResume || hasInterviewBeenTaken}
                    className="flex items-center gap-3 rounded-full bg-white px-6 py-2 text-sm font-bold text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Phone size={16} />
                    )}
                    Start Assessment
                  </button>
                ) : (
                  <div className="flex items-center gap-6">
                    <button
                      onClick={handleToggleMute}
                      className={`transition-colors ${isMuted ? 'text-orange-400' : 'text-white hover:text-zinc-400'}`}
                    >
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <button
                      onClick={handleStopCall}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
                    >
                      <PhoneOff size={16} />
                      Terminate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</p>
              <p className="text-xs font-semibold text-zinc-900">Secure Media Stream</p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Channel</p>
              <p className="text-xs font-semibold text-zinc-900">Bi-directional AI</p>
            </div>
          </div>
        </div>
      </div>



      <div className="w-full flex flex-col items-center m-6 mt-12 mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-4">
          PrepAI Interview Demo (notice)
        </h2>

        <p className="text-zinc-300 leading-relaxed text-justify mb-6">
          This deployment currently contains a demo version of the AI Interview Agent.
          The real interview system uses premium APIs and paid voice processing services,
          so live interview functionality is temporarily disabled in this public demo.
        </p>

        {/* Demo Video Section */}
        <div className="overflow-hidden rounded-xl border border-zinc-700 mb-6">
          <iframe className="w-full h-fit" width="560" height="315" src="https://www.youtube.com/embed/yf2v3BbdI70?si=q0v_Spid7n6gcRfR" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
        </div>

        <div className="bg-zinc-800/70 border border-zinc-700 flex  flex-col items-center rounded-xl p-5">
          <p className="text-zinc-200 text-justify leading-relaxed">
            If you genuinely want to experience the real AI interview session,
            we can provide a one-time interview access manually.
            Simply email your PrepAI account details and request access.
          </p>

          <div className="mt-4">
            <a
              href="mailto:daksh.official9705@gmail.com?subject=PrepAI%20Interview%20Access"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-5 py-3 rounded-lg hover:opacity-90 transition"
            >
              Email for Interview Access
            </a>
          </div>

          <p className="text-sm text-zinc-400 mt-3">
            Email: daksh.official9705@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}