"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  ArrowLeft, 
  Download, 
  Video, 
  FileText, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Activity,
  Loader2
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function CandidateDashboard() {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get("id");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setErrorMessage("Please log in to view your dashboard.");
        setIsLoading(false);
        return;
      }

      setUserId(user.uid);

      try {
        if (reportId) {
          const reportRef = doc(db, "users", user.uid, "behavioral_reports", reportId);
          const reportSnap = await getDoc(reportRef);
          
          if (reportSnap.exists()) {
            setReportData(reportSnap.data());
          } else {
            setErrorMessage("The requested report could not be found.");
          }
        } else {
          const reportsRef = collection(db, "users", user.uid, "behavioral_reports");
          const q = query(reportsRef, orderBy("createdAt", "desc"), limit(1));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            setReportData(querySnapshot.docs[0].data());
          } else {
               setErrorMessage("No behavioral reports found yet.");
          }
        }
      } catch (error: any) {
        console.error("Report Fetch Error:", error);
        setErrorMessage(`Failed to fetch report: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [reportId]);

  const generateFeedback = (emotion: string) => {
    const feedbackMap: Record<string, string> = {
        fear: "Observation: Elevated cognitive load or baseline tension detected. Strategy: Interviewers often misinterpret nerves as a lack of confidence in your technical skills. To project authority, practice 'tactical pausing'—take a deliberate 2-second breath before answering complex architectural questions to reset your pacing.",
        happy: "Observation: High engagement and positive demeanor detected. Strategy: Excellent execution. This level of enthusiasm builds strong rapport with hiring managers and demonstrates culture fit. Ensure you maintain this energy specifically when discussing challenging bugs or team conflicts to highlight your resilience.",
        neutral: "Observation: Highly composed and analytical baseline. Strategy: While maintaining a professional composure is excellent for technical explanations, it can sometimes be perceived as disengaged during behavioral questions. Consciously inject enthusiasm when discussing the business impact or end-user benefits of your projects.",
        sad: "Observation: Lower vocal energy and restricted expressions detected. Strategy: You may be overly focused on recalling technical details, causing your external energy to drop. Actively lean into the camera slightly and use hand gestures to naturally elevate your vocal tone and project passion for the engineering role.",
        angry: "Observation: Micro-expressions of frustration or defensive posture detected. Strategy: When faced with unexpected or difficult technical questions, avoid furrowing your brow. Pivot gracefully by acknowledging the complexity of the question, which demonstrates maturity and a collaborative problem-solving mindset.",
        surprise: "Observation: High reactivity to incoming questions. Strategy: While active listening is good, frequent expressions of surprise can suggest a lack of preparation. Ground yourself by actively anticipating follow-up questions regarding your system design choices and scaling strategies."
    };
    return feedbackMap[emotion.toLowerCase()] || "Analysis complete. Maintain your professional baseline and focus on clear, structured communication.";
};

  const formatChartData = (tally: Record<string, number>) => {
    if (!tally) return [];
    return Object.entries(tally)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }));
  };

  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'];

  const handleDownloadVideo = () => {
    if (reportData?.videoFileName && userId) {
      const videoUrl = `/api/video?file=${reportData.videoFileName}&userId=${userId}`;
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `interview_${reportData.videoFileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    
    const aiData = reportData.sentimentData ? reportData.sentimentData : reportData;
    const date = reportData.createdAt ? (reportData.createdAt.toDate ? reportData.createdAt.toDate().toLocaleString() : new Date(reportData.createdAt).toLocaleString()) : "N/A";
    
    let reportText = `PREPAI INTERVIEW BEHAVIORAL REPORT\n`;
    reportText += `====================================\n\n`;
    reportText += `Session Date: ${date}\n`;
    reportText += `Job Context: ${reportData.jobId || "General"}\n`;
    reportText += `Analysis Duration: ${aiData.total_seconds_analyzed || 0} seconds\n\n`;
    
    reportText += `AI FEEDBACK & STRATEGY\n`;
    reportText += `----------------------\n`;
    reportText += `Dominant Trait: ${aiData.dominant_emotion ? aiData.dominant_emotion.toUpperCase() : "N/A"}\n\n`;
    reportText += `Feedback:\n${aiData.dominant_emotion ? generateFeedback(aiData.dominant_emotion) : "Analysis complete."}\n\n`;
    
    if (aiData.emotion_breakdown) {
        reportText += `EMOTION BREAKDOWN (Frequency)\n`;
        reportText += `---------------------------\n`;
        Object.entries(aiData.emotion_breakdown).forEach(([emotion, count]) => {
            if ((count as number) > 0) {
                reportText += `${emotion.toUpperCase()}: ${count}\n`;
            }
        });
    }
    
    reportText += `\n\nGenerated by PrepAI - Your AI Interview Partner`;
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PrepAI_Report_${reportId || 'latest'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Parsing Results</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <AlertCircle className="text-muted-foreground" size={40} />
        <p className="text-sm font-medium text-muted-foreground">{errorMessage}</p>
        <button 
            onClick={() => router.push('/dashboard')}
            className="text-xs font-semibold uppercase tracking-widest text-foreground border-b border-foreground pb-1"
        >
            Return to Dashboard
        </button>
      </div>
    );
  }

  if (!reportData) return null;

  const aiData = reportData.sentimentData ? reportData.sentimentData : reportData;
  const chartData = formatChartData(aiData.emotion_breakdown);
  const isAnalysisFailed = !!aiData.error;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
        <div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-4 flex items-center gap-2 hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
            Dashboard
          </button>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Assessment Report</h1>
          <p className="mt-2 text-sm text-muted-foreground">Behavioral analysis and technical performance signals.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            className="rounded-full border-border hover:bg-muted text-xs h-10 px-6 font-semibold"
          >
            <FileText size={16} className="mr-2" />
            Export Data
          </Button>
          <Button
            onClick={handleDownloadVideo}
            className="rounded-full bg-foreground text-background text-xs h-10 px-6 font-semibold transition-all hover:opacity-90"
          >
            <Download size={16} className="mr-2" />
            Archive Media
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 space-y-8"
        >
          <div className="relative aspect-video w-full rounded-2xl border border-border bg-background shadow-xl shadow-foreground/5 overflow-hidden group">
            {reportData.videoFileName && userId ? (
              <video 
                src={`/api/video?file=${reportData.videoFileName}&userId=${userId}`} 
                controls 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Video size={48} strokeWidth={1} />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Media unavailable</p>
              </div>
            )}
          </div>

          <div className={`p-8 rounded-2xl border ${isAnalysisFailed ? 'border-amber-200 bg-amber-500/5' : 'border-border bg-background/50'} backdrop-blur-sm shadow-xl shadow-foreground/5`}>
            <div className="flex items-center gap-3 mb-4">
              {isAnalysisFailed ? <AlertCircle size={20} className="text-amber-500" /> : <CheckCircle2 size={20} className="text-foreground" />}
              <h3 className={`text-sm font-bold uppercase tracking-widest ${isAnalysisFailed ? 'text-amber-600' : 'text-foreground'}`}>
                {isAnalysisFailed ? 'Analysis Note' : 'AI Intelligence Feedback'}
              </h3>
            </div>
            <p className={`text-base leading-relaxed font-medium ${isAnalysisFailed ? 'text-amber-700' : 'text-muted-foreground'}`}>
              {isAnalysisFailed 
                ? "Recording captured successfully. Automated analysis requires minimum duration thresholds not met in this session." 
                : (aiData.dominant_emotion ? generateFeedback(aiData.dominant_emotion) : "Analysis complete. Performance aligned with professional baselines.")}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 space-y-8"
        >
          <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm p-6 shadow-xl shadow-foreground/5">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-muted-foreground" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Session Metrics</h3>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Dominant Trait</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isAnalysisFailed ? "N/A" : (aiData.dominant_emotion ? aiData.dominant_emotion.toUpperCase() : "ANALYZING")}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
              </div>
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock size={14} /> Duration</span>
                  <span className="text-foreground">{aiData.total_seconds_analyzed || 0}s</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground flex items-center gap-2"><Activity size={14} /> Signals</span>
                  <span className="text-foreground">{isAnalysisFailed ? 'Low' : 'High'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm p-6 shadow-xl shadow-foreground/5">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={18} className="text-muted-foreground" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Emotional Vector</h3>
            </div>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e4e4e7', 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Insufficient Data</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
