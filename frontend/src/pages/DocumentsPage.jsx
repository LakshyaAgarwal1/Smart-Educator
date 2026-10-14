import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText, Upload, RefreshCw, Search, ChevronDown, MoreVertical, Trash2, Eye, Plus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { UploadModal } from '../components/UploadModal';
import { api } from '../api/client';

export const DocumentsPage = () => {
  const {
    documents,
    refreshDocuments,
    docFilter,
    setDocFilter,
    docSearch,
    setDocSearch,
    navigateToDocDetail,
    setCurrentPage
  } = useApp();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Pagination state
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 50 | 'ALL'

  // Filter documents based on search and type
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const searchLower = (docSearch || '').toLowerCase();
      const matchesSearch =
        (doc.display_name || '').toLowerCase().includes(searchLower) ||
        (doc.filename || '').toLowerCase().includes(searchLower);
      const matchesType = docFilter === 'ALL' || (doc.file_type || '').toUpperCase() === docFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, docSearch, docFilter]);

  // Reset to first page when search query or filter category changes
  useEffect(() => {
    setPageIndex(1);
  }, [docSearch, docFilter]);

  // Auto-poll if any document is currently vectorizing / processing in background
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'PROCESSING');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      refreshDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, refreshDocuments]);

  // Compute pagination bounds
  const totalItems = filteredDocs.length;
  const isAll = pageSize === 'ALL';
  const effectivePageSize = isAll ? Math.max(1, totalItems) : pageSize;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  // Current slice of documents to display
  const paginatedDocs = useMemo(() => {
    if (isAll) return filteredDocs;
    const start = (pageIndex - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, pageIndex, pageSize, isAll]);

  const startIndex = totalItems === 0 ? 0 : isAll ? 1 : (pageIndex - 1) * pageSize + 1;
  const endIndex = isAll ? totalItems : Math.min(pageIndex * pageSize, totalItems);

  // Generate page numbers with smart ellipsis windowing
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (pageIndex <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (pageIndex >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', pageIndex - 1, pageIndex, pageIndex + 1, '...', totalPages];
  }, [pageIndex, totalPages]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(id);
      await refreshDocuments();
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '512 KB';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getFileIconColor = (type) => {
    const t = (type || 'PDF').toUpperCase();
    if (t === 'PDF') return 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 border-red-100 dark:border-red-900/40';
    if (t === 'DOCX' || t === 'DOC') return 'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100 dark:border-blue-900/40';
    return 'bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400 border-purple-100 dark:border-purple-900/40';
  };

  return (
    <div className="flex-1 h-full w-full overflow-y-auto p-4 md:p-8 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
                Documents
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                {totalItems} total
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Manage study materials, textbooks, and cloud synced notes
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Upload Document Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Document</span>
            </button>

            {/* Sync Google Drive Button */}
            <button
              onClick={() => setCurrentPage('drive')}
              className="px-4 py-2.5 bg-white dark:bg-[#161D2F] border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Sync Google Drive</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Search documents by name or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161D2F] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161D2F] text-xs text-gray-700 dark:text-gray-300 font-medium focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="ALL">All Documents</option>
              <option value="PDF">PDF Documents</option>
              <option value="DOCX">Word (.docx)</option>
              <option value="TXT">Text Notes</option>
            </select>
          </div>
        </div>

        {/* Documents Table / Card List */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {paginatedDocs.length > 0 ? (
              paginatedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigateToDocDetail(doc.id)}
                  className="p-4 md:px-6 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group relative"
                >
                  {/* Left: Icon & Meta */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getFileIconColor(doc.file_type)}`}>
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {doc.display_name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">{doc.file_type || 'PDF'}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.page_count || 1} {doc.page_count === 1 ? 'page' : 'pages'}</span>
                        {doc.source === 'GOOGLE_DRIVE' && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-500 font-medium text-[11px]">Google Drive</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & timestamp & 3-dots */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Dynamic Status Badge */}
                    {doc.status === 'PROCESSING' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                        <RefreshCw size={11} className="animate-spin" />
                        Vectorizing...
                      </span>
                    ) : doc.status === 'FAILED' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Failed
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Indexed
                      </span>
                    )}

                    <span className="hidden md:inline text-xs text-gray-400 dark:text-gray-500">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Active'}
                    </span>

                    {/* 3-dots action menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === doc.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 w-36 bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-30 animate-fade-in"
                        >
                          <button
                            onClick={() => {
                              navigateToDocDetail(doc.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No documents found</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">
                  {docSearch ? `No documents match "${docSearch}".` : "Upload your textbooks or study material to enable contextual AI retrieval."}
                </p>
                {!docSearch && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Upload First Document
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="p-4 px-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-[#161D2F] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400 select-none">
              {/* Range indicator */}
              <div className="flex items-center gap-1.5 text-xs">
                <span>Showing</span>
                <span className="font-bold text-gray-900 dark:text-white">{startIndex}</span>
                <span>to</span>
                <span className="font-bold text-gray-900 dark:text-white">{endIndex}</span>
                <span>of</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalItems}</span>
                <span>documents</span>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-3">
                {/* Page size dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                      setPageIndex(1);
                    }}
                    className="px-2 py-1 bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value="ALL">All</option>
                  </select>
                </div>

                {/* Page Buttons */}
                {!isAll && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                      onClick={() => setPageIndex(1)}
                      disabled={pageIndex <= 1}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft size={14} />
                    </button>

                    {/* Previous Page */}
                    <button
                      onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                      disabled={pageIndex <= 1}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {/* Number buttons */}
                    <div className="flex items-center gap-1">
                      {pageNumbers.map((num, idx) =>
                        num === '...' ? (
                          <span key={`dots-${idx}`} className="px-2 text-gray-400">
                            ...
                          </span>
                        ) : (
                          <button
                            key={num}
                            onClick={() => setPageIndex(num)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              pageIndex === num
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {num}
                          </button>
                        )
                      )}
                    </div>

                    {/* Next Page */}
                    <button
                      onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                      disabled={pageIndex >= totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight size={14} />
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => setPageIndex(totalPages)}
                      disabled={pageIndex >= totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};
