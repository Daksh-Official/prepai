"use client";

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import VapiInterviewBot from '@/components/VapiInterviewBot';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Terminal, 
  Database, 
  Layout, 
  Cpu, 
  Cloud, 
  Users 
} from 'lucide-react';

const interviewTypes = [
  { id: 'backend-engineer', name: 'Backend Engineer', icon: <Terminal className="w-5 h-5" />, prompt: 'You are an AI interviewer specializing in backend engineering. Ask questions about API design, database schemas, microservices, and system scalability. Start by welcoming the candidate.' },
  { id: 'system-design', name: 'System Design', icon: <Database className="w-5 h-5" />, prompt: 'You are an AI interviewer specializing in system design. Present a problem and ask the candidate to design a scalable, reliable, and maintainable system. Focus on topics like load balancing, caching, databases, and message queues. Start by welcoming the candidate.' },
  { id: 'frontend-engineer', name: 'Frontend Engineer', icon: <Layout className="w-5 h-5" />, prompt: 'You are an AI interviewer specializing in frontend development. Ask questions about React/Vue/Angular, state management, performance optimization, and responsive design. Start by welcoming the candidate.' },
  { id: 'data-scientist', name: 'Data Scientist', icon: <Cpu className="w-5 h-5" />, prompt: 'You are an AI interviewer specializing in data science. Ask questions about machine learning algorithms, statistical analysis, data manipulation, and model evaluation. Start by welcoming the candidate.' },
  { id: 'devops-engineer', name: 'DevOps Engineer', icon: <Cloud className="w-5 h-5" />, prompt: 'You are an AI interviewer specializing in DevOps. Ask questions about CI/CD pipelines, containerization (Docker, Kubernetes), cloud platforms (AWS, Azure, GCP), and monitoring. Start by welcoming the candidate.' },
  { id: 'behavioral', name: 'Behavioral', icon: <Users className="w-5 h-5" />, prompt: 'You are an AI interviewer focusing on behavioral questions. Ask about past experiences, how the candidate handled challenges, teamwork, and problem-solving skills. Start by welcoming the candidate.' },
];

export default function InterviewPracticePage() {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSelectInterview = (prompt: string, type: string) => {
    setSelectedPrompt(prompt);
    setSelectedType(type);
  };

  const handleBackToSelection = () => {
    setSelectedPrompt(null);
    setSelectedType(null);
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <AnimatePresence mode="wait">
          {selectedPrompt ? (
            <motion.div
              key="interview-bot"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="mb-8">
                <Button
                  onClick={handleBackToSelection}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground transition-colors p-0 h-auto flex items-center gap-2 group"
                >
                  <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                  Back to Selection
                </Button>
              </div>
              <Card className="border-border bg-background/50 backdrop-blur-sm overflow-hidden shadow-xl shadow-foreground/5">
                <div className="p-8">
                  <VapiInterviewBot interviewPrompt={selectedPrompt} interviewType={selectedType || "Practice"} />
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <header className="mb-16 text-center">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-4">Practice Arena</h2>
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Choose your session</h1>
                <p className="mt-4 text-muted-foreground">Select a specialized track to refine your technical communication skills.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {interviewTypes.map((type, index) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group border-border bg-background/50 hover:bg-muted/50 transition-all cursor-pointer shadow-sm hover:shadow-md" onClick={() => handleSelectInterview(type.prompt, type.name)}>
                      <CardHeader className="pb-4">
                        <div className="h-10 w-10 rounded-lg bg-foreground text-background flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          {type.icon}
                        </div>
                        <CardTitle className="text-xl font-bold">{type.name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground uppercase tracking-widest font-semibold pt-1">Mock Assessment</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {type.prompt.split('. ').slice(1).join('. ')}
                        </p>
                        <div className="mt-6 flex items-center text-sm font-semibold text-foreground group-hover:gap-2 transition-all">
                          Start Session <ArrowLeft size={14} className="rotate-180 opacity-0 group-hover:opacity-100 transition-all ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
