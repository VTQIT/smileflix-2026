// src/components/cms/DropUpload.tsx

import { useCallback, useRef, useState, useEffect } from "react";
import { Upload, X, Loader2, ImageIcon, Film } from "lucide-react";
import { inputCls } from "./FormField";
import { toast } from "sonner";
import { getMediaBase, getImageUrl } from "@/lib/media-source";

type Kind = "image" | "video";

interface DropUploadProps {
  bucket: "thumbnails" | "videos";
  value: string;
  onChange: (url: string) => void;
  kind: Kind;
  aspect?: "video" | "poster" | "wide";
  className?: string;
  mode?: "local";
  label?: string;
}

const ACCEPT: Record<Kind, string> = {
  image: "image/*",
  video: "video/*",
};

const safeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

export default function DropUpload({
  bucket,
  value,
  onChange,
  kind,
  aspect = "video",
  className = "",
  mode = "local",
  label,
}: DropUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreviewUrl("");
      setImageError(false);
      return;
    }

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
      setPreviewUrl(value);
      setImageError(false);
      return;
    }

    const url = getImageUrl(value);
    setPreviewUrl(url);
    setImageError(false);
  }, [value]);

  const upload = useCallback(
    async (file: File) => {
      if (!file) return;
      
      if (kind === "image" && !file.type.startsWith("image/")) {
        toast.error("Please drop an image file");
        return;
      }
      if (kind === "video" && !file.type.startsWith("video/")) {
        toast.error("Please drop a video file");
        return;
      }

      setUploading(true);
      try {
        const name = safeName(file.name);
        const url = `thumbnails/${name}`;
        onChange(url);
        toast.success(`Linked ${name} to thumbnails/`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [kind, onChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const aspectCls =
    aspect === "poster" ? "aspect-[2/3]" : aspect === "wide" ? "aspect-[21/9]" : "aspect-video";

  const Icon = kind === "video" ? Film : ImageIcon;

  const resolveMediaUrl = (path: string) => {
    const base = getMediaBase();
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${normalizedBase}${normalizedPath}`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative ${aspectCls} w-full rounded-xl border-2 border-dashed bg-input/40 overflow-hidden cursor-pointer transition-all ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border hover:border-primary/60 hover:bg-input/70"
        }`}
      >
        {previewUrl && !imageError ? (
          kind === "image" ? (
            <img 
              src={previewUrl} 
              alt="preview" 
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => {
                setImageError(true);
                console.warn('Failed to load image:', previewUrl);
              }}
            />
          ) : (
            <video 
              src={previewUrl} 
              className="absolute inset-0 w-full h-full object-cover" 
              muted 
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
            <Icon className="w-10 h-10 opacity-60" />
            <p className="text-sm font-medium text-foreground">
              Drop a {kind === "video" ? "video" : "image"} here
            </p>
            <p className="text-xs">
              or click to browse — links to <code className="px-1 rounded bg-secondary">/media/thumbnails/</code>
            </p>
            {imageError && (
              <p className="text-xs text-destructive">Image not found. Please re-upload.</p>
            )}
          </div>
        )}

        {(dragOver || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-primary-glow" />
                <span>Linking…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-primary-glow">
                <Upload className="w-5 h-5" /> Release to link
              </div>
            )}
          </div>
        )}

        {value && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setPreviewUrl("");
              setImageError(false);
            }}
            aria-label="Clear"
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="thumbnails/filename.jpg"
          className={`${inputCls} text-xs flex-1`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-xs flex items-center gap-1.5 whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" /> Browse
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}