import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Search, Filter, X, MapPin, DollarSign, SlidersHorizontal } from "lucide-react";

interface FilterState {
  searchQuery: string;
  category: string;
  sortBy: string;
  minBounty: number;
  maxBounty: number;
  maxDistance: number;
  tierFilter: string;
}

interface BrowseFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  userLocation: { lat: number; lng: number } | null;
  categories: { value: string; label: string }[];
}

export function BrowseFilters({
  filters,
  onFiltersChange,
  userLocation,
  categories,
}: BrowseFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters: FilterState = {
      searchQuery: "",
      category: "all",
      sortBy: "newest",
      minBounty: 0,
      maxBounty: 10000,
      maxDistance: 50,
      tierFilter: "all",
    };
    setTempFilters(resetFilters);
    onFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const activeFilterCount = [
    filters.category !== "all",
    filters.minBounty > 0,
    filters.maxBounty < 10000,
    filters.maxDistance < 50,
    filters.tierFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title or location..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFiltersChange({ ...filters, searchQuery: e.target.value })
            }
            className="pl-10"
          />
        </div>
        
        <Select
          value={filters.category}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, category: value })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, sortBy: value })
          }
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest">Highest Bounty</SelectItem>
            <SelectItem value="lowest">Lowest Bounty</SelectItem>
            {userLocation && <SelectItem value="nearest">Nearest First</SelectItem>}
          </SelectContent>
        </Select>

        {/* Advanced Filters Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Narrow down tasks to find the perfect match
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Bounty Range */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Bounty Range
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={tempFilters.minBounty || ""}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        minBounty: Number(e.target.value) || 0,
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={tempFilters.maxBounty === 10000 ? "" : tempFilters.maxBounty}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        maxBounty: Number(e.target.value) || 10000,
                      })
                    }
                    className="w-24"
                  />
                </div>
              </div>

              {/* Distance Range */}
              {userLocation && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Maximum Distance: {tempFilters.maxDistance} km
                  </Label>
                  <Slider
                    value={[tempFilters.maxDistance]}
                    onValueChange={([value]) =>
                      setTempFilters({ ...tempFilters, maxDistance: value })
                    }
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only show tasks within this distance from your location
                  </p>
                </div>
              )}

              {/* Tier Filter */}
              <div className="space-y-3">
                <Label>Task Tier</Label>
                <Select
                  value={tempFilters.tierFilter}
                  onValueChange={(value) =>
                    setTempFilters({ ...tempFilters, tierFilter: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="standard">Standard Only</SelectItem>
                    <SelectItem value="pro">Pro Only (Higher Pay)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset All
              </Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      <div className="flex flex-wrap gap-2">
        {filters.category !== "all" && (
          <Badge variant="secondary" className="capitalize gap-1">
            {categories.find((c) => c.value === filters.category)?.label || filters.category}
            <button
              onClick={() => onFiltersChange({ ...filters, category: "all" })}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.searchQuery && (
          <Badge variant="secondary" className="gap-1">
            Search: {filters.searchQuery}
            <button
              onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.minBounty > 0 && (
          <Badge variant="secondary" className="gap-1">
            Min: ${filters.minBounty}
            <button
              onClick={() => onFiltersChange({ ...filters, minBounty: 0 })}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.maxBounty < 10000 && (
          <Badge variant="secondary" className="gap-1">
            Max: ${filters.maxBounty}
            <button
              onClick={() => onFiltersChange({ ...filters, maxBounty: 10000 })}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.tierFilter !== "all" && (
          <Badge variant="secondary" className="gap-1 capitalize">
            {filters.tierFilter} Tasks
            <button
              onClick={() => onFiltersChange({ ...filters, tierFilter: "all" })}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
}
