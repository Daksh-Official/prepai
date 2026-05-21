"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Github, 
  Linkedin, 
  Mail, 
  Globe, 
  Heart 
} from 'lucide-react';

const Footer: React.FC = () => {
  const creators = [
        {
      name: "Daksh Gupta",
      links: {
        portfolio: "https://www.dakshgupta.in",
        linkedin: "https://www.linkedin.com/in/daksh-gupta-6a4816262?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
        github: "https://github.com/Daksh-Official",
        email: "mailto:daksh.official9705@gmail.com"
      }
    },
    {
      name: "Kartik Kumar",
      links: {
        portfolio: "https://kartikkumar-dev.vercel.app/",
        linkedin: "https://linkedin.com/in/kartikkumar925800",
        github: "https://github.com/kartikkumar925800",
        email: "mailto:K.kartikkumar8527@gmail.com"
      }
    },
  ];

  return (
    <footer className="border-t border-zinc-200 bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">P</span>
              </div>
              <span className="text-lg font-semibold tracking-tight text-zinc-900">PrepAI</span>
            </Link>
            <p className="max-w-xs text-sm text-zinc-500 leading-relaxed">
              Elevating interview preparation through intelligent feedback and human-centered design.
            </p>
          </div>

          {creators.map((creator) => (
            <div key={creator.name} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
                {creator.name}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href={creator.links.portfolio} 
                    target="_blank"
                    className="group flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    <Globe size={14} className="transition-colors group-hover:text-zinc-900" />
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link 
                    href={creator.links.linkedin} 
                    target="_blank"
                    className="group flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    <Linkedin size={14} className="transition-colors group-hover:text-zinc-900" />
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link 
                    href={creator.links.github} 
                    target="_blank"
                    className="group flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    <Github size={14} className="transition-colors group-hover:text-zinc-900" />
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link 
                    href={creator.links.email} 
                    className="group flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    <Mail size={14} className="transition-colors group-hover:text-zinc-900" />
                    Email
                  </Link>
                </li>
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-zinc-100 pt-8 lg:mt-16">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Hand-crafted with</span>
              <Heart size={12} className="fill-zinc-400 text-zinc-400" />
              <span>in India</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;