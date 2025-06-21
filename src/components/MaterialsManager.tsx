import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Image, 
  Search,
  Filter,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Edit3,
  Eye,
  Plus,
  Folder,
  Grid,
  List,
  Calendar,
  Tag,
  Star,
  StarOff,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  BookOpen,
  Brain,
  Camera,
  File,
  Archive,
  Clock,
  User,
  SortAsc,
  SortDesc,
  X,
  Save,
  Link
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { extractTextFromPDF, isPDFFile } from '../lib/pdfExtractor';
import { extractTextFromImage } from '../lib/openai';
import toast from 'react-hot-toast';

interface StudyMaterial {
  id: string;
  user_id: string;
  title: string;
  content: string;
  file_type: 'text' | 'image' | 'pdf';
  file_url?: string;
  file_size?: number;
  extracted_text?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  tags?: string[];
  is_favorite?: boolean;
  folder?: string;
}

interface MaterialsManagerProps {
  onNavigate?: (page: string) => void;
}

const MaterialsManager: React.FC<MaterialsManagerProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'text' | 'image' | 'pdf'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [sharingMaterial, setSharingMaterial] = useState<StudyMaterial | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

  // Load materials on component mount
  useEffect(() => {
    if (user) {
      loadMaterials();
    }
  }, [user]);

  const loadMaterials = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMaterials(data || []);
    } catch (error: any) {
      console.error('Error loading materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadingFiles(acceptedFiles);
    setShowUploadModal(true);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'text/*': ['.txt', '.md'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const processAndUploadFiles = async (files: File[], titles: string[]) => {
    if (!user) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const title = titles[i] || file.name;
      const fileId = Math.random().toString(36).substr(2, 9);

      setProcessingFiles(prev => new Set([...prev, fileId]));

      try {
        let extractedText = '';
        let fileUrl = '';

        // Process file based on type
        if (isPDFFile(file)) {
          extractedText = await extractTextFromPDF(file);
        } else if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          extractedText = await extractTextFromImage(base64);
          fileUrl = base64; // Store base64 for images
        } else {
          extractedText = await file.text();
        }

        // Save to database
        const { error } = await supabase
          .from('study_materials')
          .insert({
            user_id: user.id,
            title,
            content: extractedText,
            file_type: file.type.startsWith('image/') ? 'image' : 
                      isPDFFile(file) ? 'pdf' : 'text',
            file_url: fileUrl || null,
            file_size: file.size,
            extracted_text: extractedText,
            processing_status: 'completed',
            is_favorite: false
          });

        if (error) throw error;

        toast.success(`${title} uploaded successfully`);
      } catch (error: any) {
        console.error('Error processing file:', error);
        toast.error(`Failed to process ${title}: ${error.message}`);
      } finally {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }
    }

    // Reload materials
    await loadMaterials();
    setShowUploadModal(false);
    setUploadingFiles([]);
  };

  const deleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('study_materials')
        .delete()
        .eq('id', materialId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setMaterials(prev => prev.filter(m => m.id !== materialId));
      toast.success('Material deleted successfully');
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const toggleFavorite = async (materialId: string) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      const newFavoriteStatus = !material.is_favorite;

      const { error } = await supabase
        .from('study_materials')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', materialId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setMaterials(prev => prev.map(m => 
        m.id === materialId ? { ...m, is_favorite: newFavoriteStatus } : m
      ));

      toast.success(newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites');
    } catch (error: any) {
      console.error('Error updating favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const editMaterial = async (materialId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('study_materials')
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', materialId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setMaterials(prev => prev.map(m => 
        m.id === materialId ? { ...m, title: newTitle } : m
      ));

      toast.success('Material updated successfully');
      setShowEditModal(false);
      setEditingMaterial(null);
    } catch (error: any) {
      console.error('Error updating material:', error);
      toast.error('Failed to update material');
    }
  };

  const downloadMaterial = async (material: StudyMaterial) => {
    try {
      toast.loading('Preparing download...');
      
      let content = '';
      let filename = '';
      let mimeType = 'text/plain';

      if (material.file_type === 'image' && material.file_url) {
        // For images, download the base64 data
        const base64Data = material.file_url;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${material.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      } else {
        // For text and PDF (extracted text), download as text file
        content = material.content || material.extracted_text || '';
        filename = `${material.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      }
      
      toast.dismiss();
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.dismiss();
      toast.error('Failed to download material. Please try again.');
    }
  };

  const shareMaterial = async (material: StudyMaterial) => {
    try {
      // Create a shareable link (in a real app, this would be a proper sharing system)
      const shareUrl = `${window.location.origin}/shared/material/${material.id}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
      
      setShowShareModal(false);
      setSharingMaterial(null);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create share link');
    }
  };

  const generateQuizFromMaterial = (material: StudyMaterial) => {
    // Navigate to quiz generator with pre-filled content
    if (onNavigate) {
      // Store material content in localStorage for quiz generator to pick up
      localStorage.setItem('quiz_generator_content', material.content || material.extracted_text || '');
      localStorage.setItem('quiz_generator_title', `Quiz from: ${material.title}`);
      onNavigate('quiz-generator');
      toast.success(`Opening Quiz Generator with content from "${material.title}"`);
    }
  };

  // Filter and sort materials
  const filteredMaterials = materials
    .filter(material => {
      const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           material.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           material.extracted_text?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = selectedFilter === 'all' || material.file_type === selectedFilter;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'date':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Helper function to convert file to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  // Upload Modal Component
  const UploadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            setShowUploadModal(false);
            setUploadingFiles([]);
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Study Materials</h2>
          <p className="text-gray-600">
            Add titles for your files and upload them to your materials library
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {uploadingFiles.map((file, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                {getFileIcon(file.type.startsWith('image/') ? 'image' : 
                           isPDFFile(file) ? 'pdf' : 'text')}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Enter a title for this material..."
                defaultValue={file.name.replace(/\.[^/.]+$/, "")}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                id={`title-${index}`}
              />
            </div>
          ))}
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => {
              setShowUploadModal(false);
              setUploadingFiles([]);
            }}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const titles = uploadingFiles.map((_, index) => {
                const input = document.getElementById(`title-${index}`) as HTMLInputElement;
                return input?.value || uploadingFiles[index].name;
              });
              processAndUploadFiles(uploadingFiles, titles);
            }}
            disabled={processingFiles.size > 0}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {processingFiles.size > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Upload Materials</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Edit Modal Component
  const EditModal = () => {
    const [newTitle, setNewTitle] = useState(editingMaterial?.title || '');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
          <button
            onClick={() => {
              setShowEditModal(false);
              setEditingMaterial(null);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit3 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Material</h2>
            <p className="text-gray-600">Update the title of your study material</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter material title..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMaterial(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingMaterial && newTitle.trim()) {
                    editMaterial(editingMaterial.id, newTitle.trim());
                  }
                }}
                disabled={!newTitle.trim()}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Share Modal Component
  const ShareModal = () => {
    const shareUrl = sharingMaterial ? `${window.location.origin}/shared/material/${sharingMaterial.id}` : '';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
          <button
            onClick={() => {
              setShowShareModal(false);
              setSharingMaterial(null);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Material</h2>
            <p className="text-gray-600">Share "{sharingMaterial?.title}" with others</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Sharing Information
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Anyone with this link can view the material</li>
                <li>• The link will remain active until you delete the material</li>
                <li>• Viewers cannot edit or download the original file</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSharingMaterial(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (sharingMaterial) {
                    shareMaterial(sharingMaterial);
                  }
                }}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <Link className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
            <p className="text-gray-600">Organize and manage your learning resources</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Materials</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Filter */}
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="text">Text Files</option>
              <option value="image">Images</option>
              <option value="pdf">PDF Files</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Empty State */}
        {filteredMaterials.length === 0 && !loading && (
          <div className="text-center py-16">
            {materials.length === 0 ? (
              // No materials at all
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No study materials yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Upload your first study material to get started. You can upload images, PDFs, and text files.
                </p>
                <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium">
                  Upload Your First Material
                </button>
              </div>
            ) : (
              // No results for current filter/search
              <div>
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No materials found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Materials Grid/List */}
        {filteredMaterials.length > 0 && (
          <>
            {/* Stats */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">
                {filteredMaterials.length} of {materials.length} materials
              </p>
              <div className="text-sm text-gray-500">
                Total size: {formatFileSize(materials.reduce((sum, m) => sum + (m.file_size || 0), 0))}
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMaterials.map((material) => (
                  <div key={material.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        material.file_type === 'image' ? 'bg-blue-100' :
                        material.file_type === 'pdf' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {getFileIcon(material.file_type)}
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleFavorite(material.id)}
                          className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                          {material.is_favorite ? (
                            <Star className="w-4 h-4 fill-current text-yellow-500" />
                          ) : (
                            <StarOff className="w-4 h-4" />
                          )}
                        </button>
                        <div className="relative group/menu">
                          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-48 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                            <button
                              onClick={() => generateQuizFromMaterial(material)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Brain className="w-4 h-4" />
                              <span>Generate Quiz</span>
                            </button>
                            <button
                              onClick={() => {
                                setSharingMaterial(material);
                                setShowShareModal(true);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Share2 className="w-4 h-4" />
                              <span>Share</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingMaterial(material);
                                setShowEditModal(true);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => downloadMaterial(material)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </button>
                            <hr className="my-2" />
                            <button
                              onClick={() => deleteMaterial(material.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {material.content || material.extracted_text || 'No content preview available'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(material.file_size)}</span>
                      <span>{formatDate(material.created_at)}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => generateQuizFromMaterial(material)}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <Brain className="w-4 h-4" />
                        <span>Generate Quiz</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-2">Modified</div>
                  <div className="col-span-1">Actions</div>
                </div>
                {filteredMaterials.map((material) => (
                  <div key={material.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="col-span-5 flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        material.file_type === 'image' ? 'bg-blue-100' :
                        material.file_type === 'pdf' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {getFileIcon(material.file_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{material.title}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {material.content || material.extracted_text || 'No content'}
                        </p>
                      </div>
                      {material.is_favorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600 capitalize">{material.file_type}</span>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">{formatFileSize(material.file_size)}</span>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">{formatDate(material.created_at)}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => toggleFavorite(material.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        title={material.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {material.is_favorite ? (
                          <Star className="w-4 h-4 fill-current text-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => generateQuizFromMaterial(material)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Generate Quiz"
                      >
                        <Brain className="w-4 h-4" />
                      </button>
                      <div className="relative group/menu">
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-48 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                          <button
                            onClick={() => {
                              setSharingMaterial(material);
                              setShowShareModal(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingMaterial(material);
                              setShowEditModal(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => downloadMaterial(material)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => deleteMaterial(material.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Drag and Drop Overlay */}
        {materials.length > 0 && (
          <div
            {...getRootProps()}
            className={`fixed inset-8 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 pointer-events-none ${
              isDragActive 
                ? 'border-blue-400 bg-blue-50 bg-opacity-90 pointer-events-auto' 
                : 'border-transparent'
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive && (
              <div className="text-center">
                <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-blue-900 mb-2">Drop files here to upload</p>
                <p className="text-blue-700">Support for images, PDFs, and text files</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploadModal && <UploadModal />}
      {showEditModal && <EditModal />}
      {showShareModal && <ShareModal />}
    </div>
  );
};

export default MaterialsManager;