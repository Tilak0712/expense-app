"use client"

import { useEffect, useMemo, useState } from "react"
import { FinanceLayout } from "@/components/finance/finance-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Download,
  FileSpreadsheet,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Eye,
  ChevronDown,
  MoreHorizontal,
  Upload,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  fetchSalaryUploads,
  updateSalaryUploadStatus,
  downloadSalaryFile,
  deleteSalaryUpload,
  type SalaryUpload,
  AuthRequiredError,
} from "@/lib/finance/finance-supabase-data"

const statusConfig = {
  submitted: { label: "Pending", color: "bg-critical text-critical", dot: "bg-critical" },
  reviewed: { label: "In Review", color: "bg-informative text-informative", dot: "bg-primary" },
  approved: { label: "Approved", color: "bg-positive text-positive", dot: "bg-positive" },
  rejected: { label: "Rejected", color: "bg-negative text-negative", dot: "bg-negative" },
}

const PAGE_SIZE = 5

export default function SalaryPage() {
  const [salaryFiles, setSalaryFiles] = useState<SalaryUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  useEffect(() => {
    void loadSalaryData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const loadSalaryData = async () => {
    try {
      setErrorMessage("")
      const data = await fetchSalaryUploads()
      setSalaryFiles(data)
      setLastSyncedAt(new Date())
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuthRequired(true)
      } else {
        console.error("Failed to load salary data:", err)
        setErrorMessage("Unable to load salary uploads right now.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (uploadId: string, status: "reviewed" | "approved" | "rejected", notes?: string) => {
    try {
      setProcessingId(uploadId)
      setErrorMessage("")
      await updateSalaryUploadStatus(uploadId, status, notes)
      await loadSalaryData()
    } catch (err) {
      console.error("Failed to update status:", err)
      setErrorMessage(err instanceof Error ? err.message : "Failed to update salary file status.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      setErrorMessage("")
      await downloadSalaryFile(filePath, fileName)
    } catch (err) {
      console.error("Failed to download file:", err)
      setErrorMessage(err instanceof Error ? err.message : "Failed to download file.")
    }
  }

  const handleDelete = async (id: string, filePath: string) => {
    try {
      setErrorMessage("")
      setProcessingId(id)
      await deleteSalaryUpload(id, filePath)
      await loadSalaryData()
    } catch (err) {
      console.error("Failed to delete file:", err)
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete file.")
    } finally {
      setProcessingId(null)
    }
  }

  const filteredFiles = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return salaryFiles.filter((file) => {
      const matchesSearch = file.fileName.toLowerCase().includes(lowerSearch)
      const matchesStatus = statusFilter === "all" || file.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [salaryFiles, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredFiles.slice(start, start + PAGE_SIZE)
  }, [filteredFiles, currentPage])

  const totalPending = salaryFiles.filter((f) => f.status === "submitted").length
  const totalReviewed = salaryFiles.filter((f) => f.status === "reviewed").length
  const totalProcessed = salaryFiles.filter((f) => f.status === "approved").length
  const totalFiles = salaryFiles.length

  const resultStart = filteredFiles.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const resultEnd = Math.min(currentPage * PAGE_SIZE, filteredFiles.length)

  const pageWindow = useMemo(() => {
    const windowSize = 5
    const half = Math.floor(windowSize / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + windowSize - 1)
    if (end - start < windowSize - 1) {
      start = Math.max(1, end - windowSize + 1)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages])

  if (authRequired) {
    return (
      <FinanceLayout title="Salary Management">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Authentication required. Please log in.</p>
        </div>
      </FinanceLayout>
    )
  }

  if (loading) {
    return (
      <FinanceLayout title="Salary Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </FinanceLayout>
    )
  }

  return (
    <FinanceLayout title="Salary Management">
      <div className="p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black font-[family-name:var(--font-manrope)] text-foreground">Salary File Management</h2>
            <p className="text-sm text-muted-foreground">Review manager-submitted payroll files and complete finance approvals</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : "Not synced"}</span>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => void loadSalaryData()}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button size="sm" className="gap-2 text-xs bg-primary" onClick={() => window.print()}>
              <Download className="w-3.5 h-3.5" />
              Export Snapshot
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl tile-shadow border border-border/60 p-4">
            <div className="p-1.5 rounded bg-critical w-fit mb-2"><Clock className="w-3.5 h-3.5 text-critical" /></div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
            <p className="text-lg font-semibold text-foreground">{totalPending}</p>
          </div>

          <div className="bg-card rounded-xl tile-shadow border border-border/60 p-4">
            <div className="p-1.5 rounded bg-informative w-fit mb-2"><Eye className="w-3.5 h-3.5 text-primary" /></div>
            <p className="text-xs text-muted-foreground">In Review</p>
            <p className="text-lg font-semibold text-foreground">{totalReviewed}</p>
          </div>

          <div className="bg-card rounded-xl tile-shadow border border-border/60 p-4">
            <div className="p-1.5 rounded bg-positive w-fit mb-2"><CheckCircle2 className="w-3.5 h-3.5 text-positive" /></div>
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-lg font-semibold text-foreground">{totalProcessed}</p>
          </div>

          <div className="bg-card rounded-xl tile-shadow border border-border/60 p-4">
            <div className="p-1.5 rounded bg-muted w-fit mb-2"><FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <p className="text-xs text-muted-foreground">Total Files</p>
            <p className="text-lg font-semibold text-foreground">{totalFiles}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl tile-shadow border border-border/60 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-muted/60 border-border/70 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-9 bg-muted/60 border-border/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Pending</SelectItem>
                  <SelectItem value="reviewed">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl tile-shadow border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Salary Files from Managers</h3>
              <Badge variant="secondary" className="text-[10px] ml-2">{filteredFiles.length} files</Badge>
            </div>
            <Badge variant="outline" className="text-xs">Page {currentPage} / {totalPages}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">File Details</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFiles.map((file) => {
                  const busy = processingId === file.id
                  const canApprove = file.status === "submitted" || file.status === "reviewed"
                  const canMarkReview = file.status === "submitted"

                  return (
                    <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded bg-positive flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-4 h-4 text-positive" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[240px]">{file.fileName}</p>
                            <p className="text-[10px] text-muted-foreground">{(file.fileSize / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(file.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-foreground">{(file.fileSize / 1024).toFixed(0)} KB</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded ${statusConfig[file.status as keyof typeof statusConfig]?.color || "bg-muted text-muted-foreground"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[file.status as keyof typeof statusConfig]?.dot || "bg-muted-foreground"}`} />
                            {statusConfig[file.status as keyof typeof statusConfig]?.label || file.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => void handleDownload(file.filePath, file.fileName)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>

                          {canMarkReview && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => void handleStatusUpdate(file.id, "reviewed")}
                            >
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                              Review
                            </Button>
                          )}

                          {canApprove && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-primary"
                              disabled={busy}
                              onClick={() => void handleStatusUpdate(file.id, "approved")}
                            >
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                              Approve
                            </Button>
                          )}

                          {(file.status === "submitted" || file.status === "reviewed") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => void handleStatusUpdate(file.id, "rejected")}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => void handleDelete(file.id, file.filePath)}
                                disabled={processingId === file.id}
                              >
                                {processingId === file.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {paginatedFiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                      No salary files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{resultStart}-{resultEnd}</span> of {filteredFiles.length} files
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>

              {pageWindow.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  size="sm"
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  className="h-8 w-8 p-0 text-[11px]"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-informative rounded-lg p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-white">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-1">Salary Processing Workflow</h4>
              <p className="text-xs text-muted-foreground mb-3">Manager uploads are visible here for review, approval, and audit tracking.</p>
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-critical flex items-center justify-center"><span className="text-[10px] font-semibold text-critical">1</span></div><span className="text-muted-foreground">Manager submits file</span></div>
                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-informative flex items-center justify-center"><span className="text-[10px] font-semibold text-primary">2</span></div><span className="text-muted-foreground">Finance reviews and validates</span></div>
                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-positive flex items-center justify-center"><span className="text-[10px] font-semibold text-positive">3</span></div><span className="text-muted-foreground">Approval unlocks payroll processing</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FinanceLayout>
  )
}
