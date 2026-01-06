import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistItem {
  id: number;
  label: string;
  required: boolean;
}

interface ChecklistBuilderProps {
  checklist: ChecklistItem[];
  onChecklistChange: (checklist: ChecklistItem[]) => void;
  title: string;
  category: string;
  description?: string;
}

export function ChecklistBuilder({
  checklist,
  onChecklistChange,
  title,
  category,
  description,
}: ChecklistBuilderProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [newItem, setNewItem] = useState("");

  const generateChecklist = async () => {
    if (!title || !category) {
      toast({
        title: "Missing information",
        description: "Please enter a title and category first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-checklist", {
        body: { title, category, description },
      });

      if (error) throw error;

      if (data.checklist && data.checklist.length > 0) {
        onChecklistChange(data.checklist);
        toast({
          title: "Checklist generated",
          description: `${data.checklist.length} items added to your checklist`,
        });
      } else {
        toast({
          title: "No items generated",
          description: "Try adding items manually",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating checklist:", error);
      toast({
        title: "Error",
        description: "Failed to generate checklist. Try again or add items manually.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    
    const newId = checklist.length > 0 
      ? Math.max(...checklist.map(i => i.id)) + 1 
      : 1;
    
    onChecklistChange([
      ...checklist,
      { id: newId, label: newItem.trim(), required: true },
    ]);
    setNewItem("");
  };

  const removeItem = (id: number) => {
    onChecklistChange(checklist.filter((item) => item.id !== id));
  };

  const toggleRequired = (id: number) => {
    onChecklistChange(
      checklist.map((item) =>
        item.id === id ? { ...item, required: !item.required } : item
      )
    );
  };

  const updateLabel = (id: number, label: string) => {
    onChecklistChange(
      checklist.map((item) =>
        item.id === id ? { ...item, label } : item
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Verification Checklist</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateChecklist}
          disabled={isGenerating || !title || !category}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Generate
        </Button>
      </div>

      {/* Existing items */}
      <div className="space-y-2">
        {checklist.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            <Input
              value={item.label}
              onChange={(e) => updateLabel(item.id, e.target.value)}
              className="flex-1 h-8"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                checked={item.required}
                onCheckedChange={() => toggleRequired(item.id)}
              />
              <span className="text-xs text-muted-foreground">Required</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a checklist item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addItem}
          disabled={!newItem.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {checklist.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No checklist items yet. Use AI Generate or add items manually.
        </p>
      )}
    </div>
  );
}
