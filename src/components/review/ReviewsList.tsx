import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewCard } from "./ReviewCard";
import { Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  task_id: string;
  reviewer_id: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  title: string;
}

interface ReviewsListProps {
  userId?: string;
  taskId?: string;
  limit?: number;
}

export function ReviewsList({ userId, taskId, limit = 10 }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [userId, taskId]);

  const fetchReviews = async () => {
    let query = supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (taskId) {
      query = query.eq("task_id", taskId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reviews:", error);
      setLoading(false);
      return;
    }

    // Filter by userId (voucher who received the review)
    let filteredReviews = data || [];
    
    if (userId) {
      // Get tasks where this user is the voucher
      const { data: userTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("voucher_id", userId);
      
      const userTaskIds = new Set(userTasks?.map(t => t.id) || []);
      filteredReviews = filteredReviews.filter(r => userTaskIds.has(r.task_id));
    }

    setReviews(filteredReviews);

    // Fetch reviewer profiles
    const reviewerIds = [...new Set(filteredReviews.map(r => r.reviewer_id))];
    if (reviewerIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", reviewerIds);

      const profilesMap = new Map<string, Profile>();
      profilesData?.forEach(p => profilesMap.set(p.id, p));
      setProfiles(profilesMap);
    }

    // Fetch tasks
    const taskIds = [...new Set(filteredReviews.map(r => r.task_id))];
    if (taskIds.length > 0) {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);

      const tasksMap = new Map<string, Task>();
      tasksData?.forEach(t => tasksMap.set(t.id, t));
      setTasks(tasksMap);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const reviewer = profiles.get(review.reviewer_id);
        const task = tasks.get(review.task_id);
        
        return (
          <ReviewCard
            key={review.id}
            reviewerName={reviewer?.full_name || "Anonymous"}
            reviewerAvatar={reviewer?.avatar_url}
            rating={review.rating || 0}
            comment={review.comment}
            createdAt={review.created_at || new Date().toISOString()}
            taskTitle={task?.title}
          />
        );
      })}
    </div>
  );
}
