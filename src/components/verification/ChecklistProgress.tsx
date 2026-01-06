import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle, MessageSquare } from "lucide-react";

interface ChecklistItem {
  id: number;
  label: string;
  required: boolean;
}

interface CompletedItem {
  id: number;
  checked: boolean;
  notes?: string;
}

interface ChecklistProgressProps {
  checklist: ChecklistItem[];
  completedItems: CompletedItem[];
  onItemChange: (items: CompletedItem[]) => void;
  disabled?: boolean;
}

export function ChecklistProgress({
  checklist,
  completedItems,
  onItemChange,
  disabled = false,
}: ChecklistProgressProps) {
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null);

  const getItemStatus = (id: number) => {
    return completedItems.find(item => item.id === id);
  };

  const handleCheck = (id: number, checked: boolean) => {
    const existing = completedItems.find(item => item.id === id);
    if (existing) {
      onItemChange(
        completedItems.map(item =>
          item.id === id ? { ...item, checked } : item
        )
      );
    } else {
      onItemChange([...completedItems, { id, checked }]);
    }
  };

  const handleNotesChange = (id: number, notes: string) => {
    const existing = completedItems.find(item => item.id === id);
    if (existing) {
      onItemChange(
        completedItems.map(item =>
          item.id === id ? { ...item, notes } : item
        )
      );
    } else {
      onItemChange([...completedItems, { id, checked: false, notes }]);
    }
  };

  const completedCount = completedItems.filter(item => item.checked).length;
  const requiredItems = checklist.filter(item => item.required);
  const requiredCompleted = requiredItems.filter(item => 
    completedItems.find(c => c.id === item.id && c.checked)
  ).length;
  
  const progress = checklist.length > 0 
    ? (completedCount / checklist.length) * 100 
    : 0;

  const allRequiredComplete = requiredItems.length === requiredCompleted;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Verification Checklist</CardTitle>
            <CardDescription>
              Complete all required items before submitting
            </CardDescription>
          </div>
          <Badge 
            variant={allRequiredComplete ? "default" : "secondary"}
            className="gap-1"
          >
            {allRequiredComplete ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {completedCount}/{checklist.length}
          </Badge>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.map((item) => {
          const status = getItemStatus(item.id);
          const isChecked = status?.checked || false;
          const notes = status?.notes || "";
          const isExpanded = expandedNotes === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-all ${
                isChecked 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`item-${item.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      htmlFor={`item-${item.id}`}
                      className={`text-sm font-medium cursor-pointer ${
                        isChecked ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.label}
                    </label>
                    {item.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  
                  {/* Notes toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedNotes(isExpanded ? null : item.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
                    disabled={disabled}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {notes ? "Edit note" : "Add note"}
                  </button>

                  {/* Notes input */}
                  {isExpanded && (
                    <Textarea
                      placeholder="Add any observations or notes..."
                      value={notes}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      className="mt-2 text-sm"
                      rows={2}
                      disabled={disabled}
                    />
                  )}

                  {/* Show note preview when collapsed */}
                  {!isExpanded && notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Note: {notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {checklist.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-8 w-8 mx-auto mb-2" />
            <p>No checklist items defined for this task</p>
          </div>
        )}

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Required items completed
            </span>
            <span className={`font-medium ${
              allRequiredComplete ? "text-primary" : "text-muted-foreground"
            }`}>
              {requiredCompleted}/{requiredItems.length}
            </span>
          </div>
          {!allRequiredComplete && (
            <p className="text-xs text-destructive mt-2">
              Complete all required items to submit your verification
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
