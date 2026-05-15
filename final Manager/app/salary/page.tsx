"use client"

import { useState, useEffect } from "react"
import { ManagerLayout } from "@/components/manager/manager-layout"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Clock,
  ShieldCheck,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface SalaryUpload {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  financeNotes: string | null
  submittedAt: string
  reviewedAt: string | null
}

export default function SalaryPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{name: string, path: string, submittedAt: string} | null>(null)
  const [salaryUploads, setSalaryUploads] = useState<SalaryUpload[]>([])
  const [isLoadingUploads, setIsLoadingUploads] = useState(false)

  const loadSalaryUploads = async () => {
    setIsLoadingUploads(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('salary_uploads')
        .select('*')
        .eq('manager_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      if (!data) {
        setSalaryUploads([])
        return
      }

      setSalaryUploads(data.map((upload: any) => ({
        id: upload.id,
        fileName: upload.file_name,
        filePath: upload.file_path,
        fileSize: upload.file_size || 0,
        status: upload.status,
        financeNotes: upload.finance_notes,
        submittedAt: upload.submitted_at,
        reviewedAt: upload.reviewed_at,
      })))
    } catch (err) {
      console.error('Failed to load salary uploads:', err)
    } finally {
      setIsLoadingUploads(false)
    }
  }

  useEffect(() => {
    void loadSalaryUploads()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if file is Excel
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ]
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setErrorMessage('Please upload an Excel file (.xlsx, .xls) or CSV')
        setUploadStatus('error')
        return
      }
      setFile(selectedFile)
      setErrorMessage('')
      setUploadStatus('idle')
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      setErrorMessage('Please select a file to upload')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)

      // Get auth token
      const supabase = await import('@/lib/supabase/client').then(m => m.getSupabaseBrowserClient())
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        throw new Error('Your session expired. Please log in again and retry.')
      }

      const response = await fetch('/api/manager/salary/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const payload = await response.json().catch(() => ({} as { error?: string; message?: string; fileName?: string; filePath?: string }))

      if (!response.ok) {
        throw new Error(payload.error || payload.message || 'Upload failed')
      }
      setUploadedFile({
        name: payload.fileName || file.name,
        path: payload.filePath || '',
        submittedAt: new Date().toISOString()
      })
      setFile(null)
      setUploadStatus('success')
      void loadSalaryUploads()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setUploadStatus('idle')
    setErrorMessage('')
  }

  const statusConfig = {
    submitted: { label: 'Pending', color: 'bg-critical text-critical', dot: 'bg-critical' },
    reviewed: { label: 'In Review', color: 'bg-informative text-informative', dot: 'bg-primary' },
    approved: { label: 'Approved', color: 'bg-positive text-positive', dot: 'bg-positive' },
    rejected: { label: 'Rejected', color: 'bg-destructive text-destructive', dot: 'bg-destructive' },
  }

  return (
    <ManagerLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-foreground">
            Salary Upload
          </h1>
          <p className="text-muted-foreground mt-1">Upload salary Excel sheets for finance review</p>
        </div>

        {/* Upload Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 mb-6">
          {!file && !uploadedFile ? (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Upload Salary Excel Sheet
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Drag and drop your Excel file here, or click to browse
              </p>
              <input
                type="file"
                id="file-upload"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Select File
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>
          ) : uploadedFile ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                File Submitted Successfully
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Your salary sheet has been submitted to finance for review
              </p>
              <div className="bg-secondary/50 rounded-lg p-4 max-w-md mx-auto mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">File Name:</span>
                  <span className="text-sm text-muted-foreground">{uploadedFile?.name || ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Submitted At:</span>
                  <span className="text-sm text-muted-foreground">
                    {uploadedFile?.submittedAt ? new Date(uploadedFile.submittedAt).toLocaleString() : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setUploadedFile(null)}
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{file?.name || ''}</p>
                    <p className="text-sm text-muted-foreground">
                      {file ? (file.size / 1024).toFixed(2) : '0'} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {uploadStatus === 'error' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit to Finance
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isUploading}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Salary Uploads List */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Your Salary Uploads</h3>
            <button
              onClick={() => void loadSalaryUploads()}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              disabled={isLoadingUploads}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingUploads ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {isLoadingUploads ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading uploads...
            </div>
          ) : salaryUploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No salary uploads yet
            </div>
          ) : (
            <div className="space-y-3">
              {salaryUploads.map((upload) => {
                const config = statusConfig[upload.status]
                return (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{upload.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.submittedAt).toLocaleDateString()} • {(upload.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      </div>
                      {upload.status === 'approved' && (
                        <ShieldCheck className="w-4 h-4 text-positive" />
                      )}
                      {upload.status === 'rejected' && (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      {upload.status === 'reviewed' && (
                        <Clock className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload your salary Excel sheet with employee salary data
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Click "Submit to Finance" to send for review
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Finance team will review and process the salary data
              </p>
            </div>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}
