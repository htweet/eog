import { CheckCircle2, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TaskCompletionBannerProps {
  status: string;
  bountyAmount: number;
  isRequester: boolean;
  isVoucher: boolean;
  taskId: string;
}

export function TaskCompletionBanner({
  status,
  bountyAmount,
  isRequester,
  isVoucher,
  taskId,
}: TaskCompletionBannerProps) {
  const navigate = useNavigate();

  if (status === "completed") {
    return (
      <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-green-700 dark:text-green-400">
                Task Completed
              </h3>
              <p className="text-sm text-green-600 dark:text-green-500">
                {isVoucher 
                  ? `You earned $${bountyAmount.toFixed(2)} for this verification`
                  : `Payment of $${bountyAmount.toFixed(2)} has been released`
                }
              </p>
            </div>
            <div className="flex items-center gap-1 text-xl font-bold text-green-600 shrink-0">
              <DollarSign className="h-5 w-5" />
              {bountyAmount.toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "disputed") {
    return (
      <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-700 dark:text-red-400">
                Task Disputed
              </h3>
              <p className="text-sm text-red-600 dark:text-red-500">
                This task is under review. Our team will resolve this dispute shortly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "pending_review" && isRequester) {
    return (
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-700 dark:text-blue-400">
                Verification Submitted
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-500">
                The voucher has submitted their verification. Please review it.
              </p>
            </div>
            <Button onClick={() => navigate(`/task/${taskId}/review`)} className="shrink-0">
              Review Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "pending_review" && isVoucher) {
    return (
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                Awaiting Review
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Your verification has been submitted. Waiting for the requester to review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
