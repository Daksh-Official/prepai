'use client'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, FileSearch, Database } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

import { auth, db } from '@/app/firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const OCR_SPACE_API_KEY = 'helloworld' // Replace with your real API key

export default function ResumeScanner() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setText('')
      setError(null)
    }
  }

  const runOcrFromFile = async () => {
    if (!file) {
      toast.error('Please select a PDF or image file')
      return
    }

    setLoading(true)
    setError(null)
    setText('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('apikey', OCR_SPACE_API_KEY)
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')

      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.IsErroredOnProcessing) {
        setError(data.ErrorMessage.join(', '))
        toast.error('OCR Processing failed')
      } else {
        const parsedText = data.ParsedResults?.[0]?.ParsedText || 'No text found'
        setText(parsedText)
        toast.success('Resume parsed successfully')
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to call OCR API'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const getResumeUrlFromFirestore = async (): Promise<string | null> => {
    const user = auth.currentUser
    if (!user) {
      setError('User not authenticated')
      return null
    }

    const userRef = doc(db, "users", user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      setError('User document not found')
      return null
    }

    const data = userSnap.data()
    return data?.resumeUrl || null
  }

  const runOcrFromUrl = async (resumeUrl: string) => {
    setLoading(true)
    setError(null)
    setText('')

    try {
      const formData = new FormData()
      formData.append('url', resumeUrl)
      formData.append('apikey', OCR_SPACE_API_KEY)
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')

      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.IsErroredOnProcessing) {
        setError(data.ErrorMessage.join(', '))
        toast.error('OCR Processing failed')
      } else {
        const parsedText = data.ParsedResults?.[0]?.ParsedText || 'No text found'
        setText(parsedText)
        toast.success('Resume parsed from Firestore')
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to call OCR API'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleScanResumeFromDb = async () => {
    const url = await getResumeUrlFromFirestore()
    if (!url) {
      toast.error('No resume found in your profile.')
      setError('No resume URL found in Firestore.')
      return
    }
    await runOcrFromUrl(url)
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border bg-background/50 backdrop-blur-sm shadow-xl shadow-foreground/5">
          <CardHeader className="text-center pb-8 border-b border-border">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-4">Intelligence</h2>
            <CardTitle className="text-3xl font-bold tracking-tight">Resume Intelligence</CardTitle>
            <CardDescription className="mt-2">Extract technical signals and experience from your resume using OCR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label htmlFor="file-upload" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Local File</Label>
                <div className="relative group">
                    <Input
                        id="file-upload"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        className="cursor-pointer bg-muted/30 border-dashed border-2 hover:border-foreground transition-colors h-32 flex flex-col items-center justify-center pt-8"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground group-hover:text-foreground transition-colors">
                        <Upload size={24} className="mb-2" />
                        <span className="text-xs font-medium">{file ? file.name : "Drop resume here or click to browse"}</span>
                    </div>
                </div>
                <Button
                  onClick={runOcrFromFile}
                  disabled={!file || loading}
                  className="w-full rounded-full bg-foreground text-background hover:opacity-90 transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch size={18} className="mr-2" />}
                  Parse Local File
                </Button>
              </div>

              <div className="space-y-4 flex flex-col">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stored Resume</Label>
                <div className="flex-grow flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/10 p-6 text-center">
                    <Database size={24} className="text-muted-foreground mb-3" />
                    <p className="text-xs text-muted-foreground mb-6">Scan the resume already associated with your PrepAI profile.</p>
                    <Button
                        onClick={handleScanResumeFromDb}
                        disabled={loading}
                        variant="outline"
                        className="w-full rounded-full border-border hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 mt-auto"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database size={18} className="mr-2" />}
                        Sync from Profile
                    </Button>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Extraction Result</Label>
                {text && <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Success</span>}
              </div>
              <Textarea
                readOnly
                rows={12}
                value={text}
                placeholder="Parsed resume content will appear here..."
                className="w-full rounded-2xl border-border bg-muted/20 font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
