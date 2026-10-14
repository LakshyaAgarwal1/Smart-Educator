import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, FileText, CheckCircle2, Trash2, Cpu, Calendar,
  Layers, Tag, Download, ExternalLink, Search, Hash, HardDrive, Database
} from 'lucide-react';
import { api } from '../api/client';

export const DocumentDetailPage = () => {
  const { selectedDocId, setCurrentPage, refreshDocuments } = useApp();
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [chunkSearch, setChunkSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDoc();
  }, [selectedDocId]);

  const loadDoc = async () => {
    if (!selectedDocId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.getDocumentDetail(selectedDocId);
      setDoc(data);
    } catch (e) {
      console.warn('Could not load document detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!doc?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${doc.display_name}" and its indexed chunks?`)) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(doc.id);
      await refreshDocuments();
      setCurrentPage('documents');
    } catch (e) {
      alert('Failed to delete document: ' + (e.message || 'Unknown error'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-500">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs">Loading document details...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC] dark:bg-[#0B0F19]">
        <FileText size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Document not found</h3>
        <p className="text-xs text-gray-400 mt-1 mb-4">The selected document could not be retrieved.</p>
        <button
          onClick={() => setCurrentPage('documents')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const chunks = doc.chunks || [];
  const filteredChunks = chunks.filter((c) =>
    (c.content || '').toLowerCase().includes(chunkSearch.toLowerCase())
  );

  const tabs = ['Overview', 'Preview', 'Chunks', 'Metadata', 'Index Details'];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Link */}
        <button
          onClick={() => setCurrentPage('documents')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Documents</span>
        </button>

        {/* Document Header Card */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                    {doc.display_name}
                  </h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    doc.status === 'PROCESSED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  }`}>
                    {doc.status === 'PROCESSED' ? 'Indexed' : doc.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-600 dark:text-gray-300">{doc.file_type || 'PDF'}</span>
                  <span>•</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{doc.page_count || 1} pages</span>
                  <span>•</span>
                  <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                  {doc.source === 'GOOGLE_DRIVE' && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-500 font-medium">Google Drive</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all flex items-center gap-1.5"
                  title="Open/Download original document"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 mt-6 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 border-b-2 transition-all shrink-0 ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab} {tab === 'Chunks' ? `(${chunks.length})` : ''}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'Overview' && (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {doc.description || `Study material document synchronized for ${doc.display_name}.`}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1.5">
                    <Tag size={13} />
                    <span>Tags</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(doc.tags && doc.tags.length > 0 ? doc.tags : [doc.file_type?.toLowerCase() || 'document', 'study']).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Index Status
                  </h4>
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>{doc.status === 'PROCESSED' ? 'Indexed and Ready for RAG' : doc.status}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Indexed Chunks
                  </h4>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-display">
                    {chunks.length || doc.chunks_count || 0}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Chunks indexed for hybrid semantic search</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Embedding Model
                  </h4>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {doc.embedding_model || 'Google Gemini Embedding (768-d)'}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Storage Source
                  </h4>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {doc.source === 'GOOGLE_DRIVE' ? 'Google Drive Cloud Sync' : 'Direct Upload (Isolated User Storage)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Real Document Preview */}
          {activeTab === 'Preview' && (
            <div className="pt-6 animate-fade-in space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Extracted text preview from indexed chunks:
                </span>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open Original Document</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {chunks.length > 0 ? (
                <div className="p-6 bg-gray-50 dark:bg-[#0E1322] rounded-xl border border-gray-200 dark:border-gray-800 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-4 max-h-[32rem] overflow-y-auto leading-relaxed">
                  <div className="pb-3 border-b border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-900 dark:text-white uppercase font-sans">
                    {doc.display_name}
                  </div>
                  {chunks.slice(0, 10).map((chunk, idx) => (
                    <div key={chunk.id || idx} className="pb-3 border-b border-gray-200/50 dark:border-gray-800">
                      <div className="text-[10px] text-indigo-500 font-semibold mb-1">
                        [Section / Page {chunk.page_number || 1} • Chunk #{chunk.chunk_index || idx + 1}]
                      </div>
                      <p className="whitespace-pre-wrap">{chunk.content}</p>
                    </div>
                  ))}
                  {chunks.length > 10 && (
                    <div className="text-center pt-2 text-gray-400 italic">
                      + {chunks.length - 10} more chunks available in the "Chunks" tab
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                  <FileText size={36} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    No text extracted for preview
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    This file is stored in your secure workspace storage.
                  </p>
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                    >
                      <Download size={14} />
                      <span>Download File</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Real Chunks List */}
          {activeTab === 'Chunks' && (
            <div className="pt-6 space-y-4 animate-fade-in">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search across ${chunks.length} chunks...`}
                  value={chunkSearch}
                  onChange={(e) => setChunkSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-600 transition-colors"
                />
              </div>

              {filteredChunks.length > 0 ? (
                <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                  {filteredChunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 text-xs space-y-2 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-gray-400">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            Chunk #{chunk.chunk_index}
                          </span>
                          <span>•</span>
                          <span>Page {chunk.page_number || 1}</span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-400">
                          {chunk.vector_id || `vec_${doc.id}_${chunk.chunk_index}`}
                        </span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-400">
                  {chunkSearch ? 'No chunks match your search query.' : 'No chunks found for this document.'}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Real Document Metadata */}
          {activeTab === 'Metadata' && (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-1 flex items-center gap-1.5">
                  <Hash size={13} />
                  <span>SHA-256 Checksum</span>
                </div>
                <div className="font-mono text-gray-800 dark:text-gray-200 break-all select-all">
                  {doc.file_hash || 'Calculating...'}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-1 flex items-center gap-1.5">
                  <HardDrive size={13} />
                  <span>Original Filename</span>
                </div>
                <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {doc.filename || doc.display_name}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-1">File Size</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatFileSize(doc.file_size)} ({doc.file_size?.toLocaleString() || 0} bytes)
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-1">Page Count</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {doc.page_count || 1} pages
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-1">Source Provider</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {doc.source === 'GOOGLE_DRIVE' ? 'Google Drive Sync' : 'Direct User Upload'}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-1">Upload Timestamp</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatDate(doc.uploaded_at)}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Index Details */}
          {activeTab === 'Index Details' && (
            <div className="pt-6 space-y-4 text-xs animate-fade-in">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-400">Vector Store Engine</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Database size={13} className="text-indigo-500" />
                    <span>ChromaDB Vector Store + SQLite Relational Mirror</span>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-400">Embedding Model</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {doc.embedding_model || 'Google Gemini Embedding'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-400">Distance Metric</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Cosine Similarity</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-400">Vector Dimension</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">768</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-400">Total Indexed Chunks</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {chunks.length} chunks
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Retrieval Pipeline</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Hybrid (BM25 + Dense Semantic + Cross-Encoder Rerank)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
