"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  Video, 
  BarChart3, 
  Briefcase, 
  Trash2, 
  Plus, 
  ChevronRight, 
  AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function MainDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();

  const fetchReports = async (user: any) => {
    try {
      const reportsRef = collection(db, "users", user.uid, "behavioral_reports");
      const q = query(reportsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const fetchedReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setReports(fetchedReports);
    } catch (error: any) {
      try {
          const reportsRef = collection(db, "users", user.uid, "behavioral_reports");
          const fallbackQ = query(reportsRef, orderBy("timestamp", "desc"));
          const fallbackSnapshot = await getDocs(fallbackQ);

          const fallbackReports = fallbackSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));
          setReports(fallbackReports);
      } catch (fallbackError) {
          setErrorMessage("Failed to load interview history.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setErrorMessage("Please log in to view your dashboard.");
        setIsLoading(false);
        return;
      }
      fetchReports(user);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (e: React.MouseEvent, reportId: string, videoFileName?: string) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this interview session?")) {
        return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsDeleting(reportId);
    try {
        const reportRef = doc(db, "users", user.uid, "behavioral_reports", reportId);
        await deleteDoc(reportRef);

        try {
            await fetch(`/api/delete-report?reportId=${reportId}&userId=${user.uid}&videoFileName=${videoFileName || ""}`, {
                method: 'DELETE',
            });
        } catch (apiErr) {
            console.error("Cleanup failed:", apiErr);
        }

        toast.success("Session deleted");
        setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error: any) {
        toast.error(`Delete failed: ${error.message}`);
    } finally {
        setIsDeleting(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown Date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Syncing Dashboard</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <AlertCircle className="text-zinc-300" size={40} />
        <p className="text-sm font-medium text-zinc-600">{errorMessage}</p>
        <button 
            onClick={() => window.location.reload()}
            className="text-xs font-semibold uppercase tracking-widest text-zinc-900 border-b border-zinc-900 pb-1"
        >
            Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-16">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-2">Command Center</h2>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Your Interviews</h1>
          <p className="mt-2 text-sm text-muted-foreground">Examine and refine your behavioral performance.</p>
        </div>
        <button 
          onClick={() => router.push('/interview?jobId=general_swe')} 
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-foreground/5"
        >
          <Plus size={18} />
          Start New Interview
        </button>
      </header>

      <div className="space-y-1">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-border text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <div className="col-span-6 md:col-span-4">Session Details</div>
          <div className="hidden md:block md:col-span-3">Timestamp</div>
          <div className="col-span-4 md:col-span-3 text-right md:text-left">Dominant Trait</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        <AnimatePresence mode="popLayout">
          {reports.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-3xl bg-muted/20"
            >
              <Video className="text-muted-foreground mb-4" size={48} strokeWidth={1} />
              <h3 className="text-sm font-semibold text-foreground">No history found</h3>
              <p className="text-xs text-muted-foreground mt-1">Complete an interview to see your metrics.</p>
            </motion.div>
          ) : (
            <div className="divide-y divide-border border-x border-border rounded-b-xl overflow-hidden bg-background/50 backdrop-blur-sm">
              {reports.map((report) => {
                const aiData = report.sentimentData ? report.sentimentData : report;
                const dominantEmotion = aiData.dominant_emotion ? aiData.dominant_emotion.toUpperCase() : "N/A";

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    key={report.id}
                    onClick={() => router.push(`/interview-report?id=${report.id}`)}
                    className="grid grid-cols-12 items-center px-6 py-5 hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className="col-span-6 md:col-span-4">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-all">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground line-clamp-1">Mock Interview</p>
                          <p className="text-xs text-muted-foreground mt-0.5">ID: {report.jobId || "General"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-3 items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Clock size={14} className="text-muted-foreground/60" />
                      {formatDate(report.createdAt || report.timestamp)}
                    </div>

                    <div className="col-span-4 md:col-span-3 text-right md:text-left">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:bg-foreground group-hover:text-background transition-colors">
                        {dominantEmotion}
                      </span>
                    </div>

                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={(e) => handleDelete(e, report.id, report.videoFileName)}
                        disabled={isDeleting === report.id}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                      >
                        {isDeleting === report.id ? (
                          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                      <div className="hidden sm:flex p-2 text-muted-foreground/30 group-hover:text-foreground transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm p-8 shadow-xl shadow-foreground/5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Quick Insights</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <span className="text-xs text-muted-foreground font-medium">Total Interviews</span>
                    <span className="text-2xl font-bold text-foreground">{reports.length}</span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (reports.length / 10) * 100)}%` }}
                        className="h-full bg-foreground" 
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}