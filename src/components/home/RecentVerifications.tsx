import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin, Clock, Star } from "lucide-react";

interface Verification {
  id: string;
  task_id: string;
  submitted_at: string | null;
  ai_analysis_score: number | null;
  task?: {
    title: string;
    category: string;
    address: string;
    bounty_amount: number;
  };
}

const categoryColors: Record<string, string> = {
  property: "bg-gradient-to-br from-blue-500 to-blue-600",
  auto: "bg-gradient-to-br from-orange-500 to-orange-600",
  retail: "bg-gradient-to-br from-purple-500 to-purple-600",
  document: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  condition: "bg-gradient-to-br from-pink-500 to-pink-600",
  general: "bg-gradient-to-br from-gray-500 to-gray-600",
};

export function RecentVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentVerifications();
  }, []);

  const fetchRecentVerifications = async () => {
    const { data, error } = await supabase
      .from("verifications")
      .select(`
        id,
        task_id,
        submitted_at,
        ai_analysis_score,
        task:tasks (
          title,
          category,
          address,
          bounty_amount
        )
      `)
      .order("submitted_at", { ascending: false })
      .limit(6);

    if (!error && data) {
      // Transform nested object properly
      const transformed = data.map(v => ({
        ...v,
        task: Array.isArray(v.task) ? v.task[0] : v.task
      }));
      setVerifications(transformed);
    }
    setLoading(false);
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">Recent Verifications</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (verifications.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Recent Verifications</h2>
            <p className="text-muted-foreground">Latest completed verifications across the platform</p>
          </div>
          <Badge variant="outline" className="hidden sm:flex">
            <CheckCircle className="h-3 w-3 mr-1 text-primary" />
            {verifications.length} Verified
          </Badge>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verifications.map((verification) => (
            <Card 
              key={verification.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
            >
              {/* Colorful category header */}
              <div className={`h-2 ${categoryColors[verification.task?.category || 'general']}`} />
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge 
                    variant="outline" 
                    className="capitalize text-xs"
                  >
                    {verification.task?.category || 'General'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {verification.submitted_at ? formatTimeAgo(verification.submitted_at) : 'Recently'}
                  </div>
                </div>
                <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                  {verification.task?.title || 'Verification Complete'}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{verification.task?.address || 'Location verified'}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-sm">
                      {verification.ai_analysis_score 
                        ? `${(verification.ai_analysis_score * 100).toFixed(0)}% AI Score`
                        : 'Verified'
                      }
                    </span>
                  </div>
                  <span className="font-bold text-primary">
                    ₦{verification.task?.bounty_amount?.toLocaleString() || '0'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
