"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import { 
  ArrowRight, 
  Terminal, 
  CheckCircle2, 
  BrainCircuit, 
  Mic2, 
  BarChart3 
} from 'lucide-react';
import { motion } from 'framer-motion';

import teamData from '@/app/data';

const Page = () => {
  const [userCount, setUserCount] = useState<number | string>(0);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        setUserCount(usersSnapshot.size);
      } catch (error) {
        console.error("Error fetching user count:", error);
        setUserCount('-');
      }
    };

    fetchUserCount();
  }, []);

  return (
    <div className="relative isolate">
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-32 sm:pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          >
            <div className="mb-12 flex justify-center">
              <div className="rounded-full px-4 py-1.5 text-xs font-medium leading-6 text-muted-foreground ring-1 ring-border bg-background/50 backdrop-blur-sm">
                PrepAI is Live. {userCount}+ interviews completed.{' '}
                <Link href="/login" className="font-semibold text-foreground">
                  Try it now <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Master your next <br />
              <span className="text-muted-foreground/60">technical interview.</span>
            </h1>
            
            <p className="mt-8 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto font-normal">
              AI-driven mock interviews with real-time feedback on your answers and technical accuracy. Built for engineers.
            </p>

            <div className="mt-12 flex items-center justify-center gap-x-6">
              <Link
                href="/login"
                className="rounded-full bg-foreground px-8 py-4 text-sm font-semibold text-background shadow-lg shadow-foreground/5 transition-all hover:opacity-90 active:scale-95"
              >
                Start Mock Interview
              </Link>
              <Link href="/about" className="text-sm font-semibold leading-6 text-foreground flex items-center gap-1 group">
                Learn more <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="mt-32 sm:mt-40 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col border-l border-border pl-8 group">
            <dt className="text-sm font-semibold leading-7 text-foreground flex items-center gap-3">
              <BrainCircuit size={18} className="text-muted-foreground" />
              Resume Parsing
            </dt>
            <dd className="mt-4 text-sm leading-7 text-muted-foreground">
              Targeted, company-specific technical questions tailored to your experience.
            </dd>
          </div>
          <div className="flex flex-col border-l border-border pl-8 group">
            <dt className="text-sm font-semibold leading-7 text-foreground flex items-center gap-3">
              <Mic2 size={18} className="text-muted-foreground" />
              Live Voice Bot
            </dt>
            <dd className="mt-4 text-sm leading-7 text-muted-foreground">
              Real-time technical screenings with an advanced voice bot that probes your depth.
            </dd>
          </div>
          <div className="flex flex-col border-l border-border pl-8 group">
            <dt className="text-sm font-semibold leading-7 text-foreground flex items-center gap-3">
              <BarChart3 size={18} className="text-muted-foreground" />
              Deep Analytics
            </dt>
            <dd className="mt-4 text-sm leading-7 text-muted-foreground">
              Exhaustive reports on confidence and accuracy to identify areas for growth.
            </dd>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32 border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-4">Engineering Team</h2>
          </div>
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 max-w-4xl mx-auto">
            {teamData.map((member) => (
              <div key={member.id} className="space-y-4 flex flex-col items-center">
                <img src={member.image} className="rounded-full w-40 h-40" width="200px" height="200px" alt="" />
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">{member.name}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <Link href={member.linkedin} target="_blank" className="inline-block text-xs font-bold border-b border-foreground pb-0.5">
                    LinkedIn &rarr;
                  </Link>
                  <Link href={`mailto:${member.email}`} className="inline-block text-xs font-bold border-b border-foreground pb-0.5">
                    Email &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Page;