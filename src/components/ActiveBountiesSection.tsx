import { Flame } from "lucide-react";
import { BountyCard } from "./BountyCard";
import { Button } from "./ui/button";

const sampleBounties = [
  {
    id: 1,
    title: "2019 Honda Civic - Pre-purchase inspection",
    location: "Brooklyn, NY",
    distance: "2.3 km",
    price: 45,
    category: "auto" as const,
    timePosted: "12 min ago",
    urgency: "high" as const,
  },
  {
    id: 2,
    title: "Studio apartment walkthrough in Manhattan",
    location: "Manhattan, NY",
    distance: "4.1 km",
    price: 35,
    category: "realestate" as const,
    timePosted: "34 min ago",
    urgency: "medium" as const,
  },
  {
    id: 3,
    title: "MacBook Pro M2 - Verify condition",
    location: "Queens, NY",
    distance: "5.8 km",
    price: 25,
    category: "electronics" as const,
    timePosted: "1 hour ago",
    urgency: "medium" as const,
  },
  {
    id: 4,
    title: "Vintage leather sofa - Condition check",
    location: "Jersey City, NJ",
    distance: "8.2 km",
    price: 30,
    category: "general" as const,
    timePosted: "2 hours ago",
    urgency: "low" as const,
  },
  {
    id: 5,
    title: "Tesla Model 3 - Battery health check",
    location: "Hoboken, NJ",
    distance: "6.5 km",
    price: 60,
    category: "auto" as const,
    timePosted: "3 hours ago",
    urgency: "high" as const,
  },
];

export function ActiveBountiesSection() {
  return (
    <section className="py-12">
      <div className="container">
        {/* Section header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Active Bounties Near You
              </h2>
            </div>
            <p className="text-muted-foreground">
              Pick up a task and start earning today
            </p>
          </div>
          <Button variant="outline" className="hidden sm:flex">
            View all bounties
          </Button>
        </div>

        {/* Bounties list */}
        <div className="grid gap-4 lg:grid-cols-2">
          {sampleBounties.map((bounty, index) => (
            <div
              key={bounty.id}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <BountyCard {...bounty} />
            </div>
          ))}
        </div>

        {/* Mobile view all button */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Button variant="outline" className="w-full">
            View all bounties
          </Button>
        </div>
      </div>
    </section>
  );
}
