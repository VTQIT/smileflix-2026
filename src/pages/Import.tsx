// src/pages/Import.tsx
import { useEffect, useState } from "react";
import { Film, FolderOpen, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/cms/DashboardLayout";
import MovieFileImport from "@/components/cms/MovieFileImport";
import { getCategories, getMovies } from "@/lib/cms-storage";
import { Category } from "@/lib/cms-storage";
import { toast } from "sonner";

export default function ImportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalMovies, setTotalMovies] = useState(0);
  const [moviesWithMetadata, setMoviesWithMetadata] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStats = () => {
    const movies = getMovies();
    setTotalMovies(movies.length);
    setMoviesWithMetadata(movies.filter(m => m.genres && m.genres.length > 0).length);
    setCategories(getCategories());
  };

  useEffect(() => {
    refreshStats();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      refreshStats();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleImport = (count: number) => {
    refreshStats();
    toast.success(`Successfully imported ${count} movies!`);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshStats();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const importableCats = categories.filter(c => !c.virtual);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Import Movies</h1>
            <p className="text-muted-foreground mt-1">
              Import video files directly from your computer or paste titles in bulk.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Total Movies</div>
            <div className="text-2xl font-bold mt-1">{totalMovies}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Categories</div>
            <div className="text-2xl font-bold mt-1">{importableCats.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Movies with Metadata</div>
            <div className="text-2xl font-bold mt-1">
              {moviesWithMetadata}
              {totalMovies > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({Math.round((moviesWithMetadata / totalMovies) * 100)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* File Import Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Import from Files
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Select video files from your computer. Metadata will be automatically matched from our local database.
            <br />
            <span className="text-xs opacity-70">
              Supports: .mp4, .mkv, .avi, .mov, .wmv, .flv, .webm
            </span>
          </p>
          <MovieFileImport
            categories={categories}
            onImported={handleImport}
          />
        </div>

        {/* Bulk Text Import Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Film className="w-5 h-5" />
            Bulk Text Import
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Paste a list of movie titles with descriptions. Each line can be in format:
            <br />
            <code className="text-xs bg-secondary/50 px-2 py-0.5 rounded">Title — Description</code> or{" "}
            <code className="text-xs bg-secondary/50 px-2 py-0.5 rounded">Title,Description</code>
            <br />
            <span className="text-xs opacity-70">
              Lines starting with # are ignored. Blank lines are skipped.
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                // Navigate to movies page and open the bulk import modal
                // You'll need to pass a state or use a global event
                window.location.href = '/cms/movies?openBulkImport=true';
              }}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-foreground font-medium transition-colors"
            >
              Go to Movies to bulk import
            </button>
            <button
              type="button"
              onClick={() => {
                // Download template
                const csv =
                  "Title,Description\n" +
                  '"Oppenheimer","A biopic of the man behind the atomic bomb."\n' +
                  '"Dune: Part Two","Paul Atreides unites with the Fremen."\n' +
                  '"Wednesday","A young Addams enrolls at Nevermore Academy."\n';
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "smileflex-bulk-import-template.csv";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Template downloaded");
              }}
              className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary-glow font-medium transition-colors"
            >
              Download Template
            </button>
          </div>
        </div>

        {/* Tips Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Tips for Importing</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary-glow font-bold">•</span>
              <span>Movies are automatically matched to our local metadata database by title</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-glow font-bold">•</span>
              <span>If a movie isn't found in the database, it will use fallback metadata</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-glow font-bold">•</span>
              <span>Duplicate detection prevents importing the same movie twice</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-glow font-bold">•</span>
              <span>All imported movies are saved locally in your browser's storage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-glow font-bold">•</span>
              <span>You can edit movie metadata after import in the Movies section</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}