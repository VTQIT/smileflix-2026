// src/components/cms/AIAssistantPanel.tsx

import { useState } from "react";
import { X, Sparkles, Clock } from "lucide-react";

interface AIAssistantPanelProps {
  onClose: () => void;
  onMovieAdded?: () => void;
}

export default function AIAssistantPanel({ onClose, onMovieAdded }: AIAssistantPanelProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-glow" />
            AI Assistant
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-secondary/30 mb-4">
            <Clock className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-sm">
            The AI Assistant is currently being rebuilt. Check back soon for AI-powered movie suggestions and metadata generation.
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 rounded-xl gradient-brand text-primary-foreground font-medium hover:shadow-glow transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}