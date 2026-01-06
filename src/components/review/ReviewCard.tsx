import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "./RatingStars";

interface ReviewCardProps {
  reviewerName: string;
  reviewerAvatar?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: string;
  taskTitle?: string;
}

export function ReviewCard({
  reviewerName,
  reviewerAvatar,
  rating,
  comment,
  createdAt,
  taskTitle,
}: ReviewCardProps) {
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={reviewerAvatar || undefined} />
            <AvatarFallback>
              {reviewerName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-medium">{reviewerName || "Anonymous"}</p>
              <span className="text-xs text-muted-foreground">{getTimeAgo(createdAt)}</span>
            </div>
            {taskTitle && (
              <p className="text-xs text-muted-foreground mb-1">for {taskTitle}</p>
            )}
            <RatingStars rating={rating} readonly size="sm" />
            {comment && (
              <p className="text-sm text-muted-foreground mt-2">{comment}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
