// src/components/cms/MovieFileImport.tsx

import { useState, useRef } from 'react';
import { Upload, FolderOpen, Film, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Category } from '@/lib/cms-storage';
import { importMoviesFromFiles, extractMovieTitle, getLocalMetadata } from '@/lib/movie-import';
import { toast } from 'sonner';

interface MovieFileImportProps {
  categories: Category[];
  onImported: (count: number) => void;
}

export default function MovieFileImport({ categories, onImported }: MovieFileImportProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const videoFiles = Array.from(fileList).filter(f => 
      f.type.startsWith('video/') || 
      f.name.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i)
    );
    
    if (videoFiles.length === 0) {
      toast.error('No video files found. Please select video files.');
      return;
    }
    
    setFiles(videoFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleImport = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    
    if (files.length === 0) {
      toast.error('No files to import');
      return;
    }
    
    setIsImporting(true);
    
    try {
      const result = await importMoviesFromFiles(files, selectedCategory, {
        published: true,
        skipDuplicates: true,
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      });
      
      toast.success(
        `Imported ${result.imported} movie${result.imported === 1 ? '' : 's'}` +
        (result.skipped > 0 ? ` · ${result.skipped} skipped` : '')
      );
      
      onImported(result.imported);
      setFiles([]);
      setProgress({ current: 0, total: 0 });
    } catch (error) {
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const importableCats = categories.filter(c => !c.virtual);

  return (
    <div className="space-y-4">
      {/* Category selection */}
      <div>
        <label className="text-sm font-medium block mb-2">
          Select Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-secondary/30 border border-border focus:border-primary focus:outline-none"
        >
          <option value="">Choose a category...</option>
          {importableCats.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : files.length > 0
            ? 'border-success bg-success/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {files.length === 0 ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-secondary/50">
                <FolderOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Drop video files here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse your computer
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports .mp4, .mkv, .avi, .mov, .wmv, .flv, .webm
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {files.length} file{files.length === 1 ? '' : 's'} selected
              </span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-1 text-left">
              {files.map((file, index) => {
                const title = extractMovieTitle(file.name);
                const metadata = getLocalMetadata(title);
                const size = (file.size / (1024 * 1024)).toFixed(1);
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Film className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {size} MB
                          {metadata && (
                            <span className="ml-2 text-success">
                              ✓ {metadata.year} · {metadata.genres.join(', ')}
                            </span>
                          )}
                          {!metadata && (
                            <span className="ml-2 text-warning">
                              ⚠ No metadata found
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {isImporting && progress.total > 0 && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Importing {progress.current} of {progress.total}...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import button */}
      {files.length > 0 && (
        <button
          type="button"
          onClick={handleImport}
          disabled={!selectedCategory || isImporting}
          className="w-full px-4 py-3 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {isImporting ? 'Importing...' : `Import ${files.length} Movie${files.length === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}