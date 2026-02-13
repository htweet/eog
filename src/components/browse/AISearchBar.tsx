import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, X, Loader2 } from "lucide-react";

interface AISearchBarProps {
  onSearch: (query: string) => void;
  onAISuggestion: (suggestion: string) => void;
  loading?: boolean;
}

const quickFilters = [
  { label: "Near me", icon: "📍" },
  { label: "High pay", icon: "💰" },
  { label: "Quick jobs", icon: "⚡" },
  { label: "Vehicles", icon: "🚗" },
  { label: "Real Estate", icon: "🏠" },
  { label: "Electronics", icon: "📱" },
];

export function AISearchBar({ onSearch, onAISuggestion, loading }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleQuickFilter = (filter: string) => {
    onAISuggestion(filter);
  };

  return (
    <div className="space-y-3">
      {/* AI-Enhanced Search Bar */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center gap-2 bg-card border border-border/50 rounded-xl p-1.5 shadow-sm">
          <div className="flex items-center gap-2 pl-3 flex-1">
            {loading ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search tasks or describe what you're looking for..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-10 text-sm"
            />
            {query && (
              <button onClick={() => handleSearch("")} className="p-1 hover:bg-muted rounded-full">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button size="sm" className="gap-1.5 rounded-lg h-9 px-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Search</span>
          </Button>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {quickFilters.map((filter) => (
          <Badge
            key={filter.label}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors whitespace-nowrap py-1.5 px-3 text-xs font-medium"
            onClick={() => handleQuickFilter(filter.label)}
          >
            <span className="mr-1">{filter.icon}</span>
            {filter.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
