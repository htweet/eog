import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  task_id: string;
  reviewer_id: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export function useReviews(userId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchReviews();
    }
  }, [userId]);

  const fetchReviews = async () => {
    if (!userId) return;

    // First get all tasks where user is the voucher
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("voucher_id", userId)
      .eq("status", "completed");

    if (!tasks || tasks.length === 0) {
      setLoading(false);
      return;
    }

    const taskIds = tasks.map(t => t.id);

    // Fetch reviews for those tasks
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      setLoading(false);
      return;
    }

    setReviews(data || []);

    // Calculate stats
    if (data && data.length > 0) {
      const ratings = data.map(r => r.rating).filter((r): r is number => r !== null);
      const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => {
        if (r >= 1 && r <= 5) distribution[r]++;
      });

      setStats({
        averageRating: avg,
        totalReviews: ratings.length,
        ratingDistribution: distribution,
      });
    }

    setLoading(false);
  };

  return { reviews, stats, loading, refetch: fetchReviews };
}
