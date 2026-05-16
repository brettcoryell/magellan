'use client'

import { useState, useRef } from 'react'
import { CareerProfile } from '@/lib/types'

interface ResumeUploadProps {
  profileId: string | null
  onComplete: (profile: CareerProfile) => void
}

export default function ResumeUpload({ profileId, onComplete }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (f: File | null) => {
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.')
      return
    }
    setFile(f)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileChange(dropped)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Upload failed. Please try again.')
        return
      }

      onComplete(data.profile as CareerProfile)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="text-slate-100 font-semibold mb-1">Upload Your Resume</h3>
      <p className="text-slate-400 text-sm mb-4">
        We'll extract your skills, experience, and background automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
            dragOver
              ? 'border-amber-500 bg-amber-500/5'
              : file
              ? 'border-emerald-600 bg-emerald-950/20'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 bg-emerald-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-emerald-400 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB · PDF</p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null) }}
                className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-slate-300 font-medium">Drop your resume here</p>
              <p className="text-xs text-slate-500 mt-1">PDF only · Max 10MB</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing resume...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Resume
            </>
          )}
        </button>
      </form>
    </div>
  )
}
