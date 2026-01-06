import { useState, useEffect } from "react";
import { Car, Home, Smartphone, Package } from "lucide-react";
import { CategoryCard } from "./CategoryCard";
import { supabase } from "@/integrations/supabase/client";

interface CategoryStats {
  auto: number;
  realestate: number;
  electronics: number;
  general: number;
}

export function CategoriesSection() {
  const [stats, setStats] = useState<CategoryStats>({
    auto: 0,
    realestate: 0,
    electronics: 0,
    general: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("category")
      .eq("status", "open");

    if (!error && data) {
      const counts = data.reduce(
        (acc, task) => {
          const cat = task.category as keyof CategoryStats;
          if (acc[cat] !== undefined) {
            acc[cat] += 1;
          }
          return acc;
        },
        { auto: 0, realestate: 0, electronics: 0, general: 0 }
      );
      setStats(counts);
    }
  };

  const categories = [
    {
      title: "Automobiles",
      description: "Verify vehicles before purchase. Check condition, mileage, and documentation.",
      icon: Car,
      category: "auto" as const,
      bountyCount: stats.auto,
    },
    {
      title: "Real Estate",
      description: "Tour apartments and properties remotely. Verify listings are real.",
      icon: Home,
      category: "realestate" as const,
      bountyCount: stats.realestate,
    },
    {
      title: "Electronics",
      description: "Confirm devices work before buying. Test screens, batteries, and more.",
      icon: Smartphone,
      category: "electronics" as const,
      bountyCount: stats.electronics,
    },
    {
      title: "General Items",
      description: "Verify furniture, collectibles, or any item. If it exists, we can vouch for it.",
      icon: Package,
      category: "general" as const,
      bountyCount: stats.general,
    },
  ];

  return (
    <section className="py-12">
      <div className="container">
        {/* Section header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
              Browse Categories
            </h2>
            <p className="text-muted-foreground">
              Select a category to find verification requests near you
            </p>
          </div>
          <button className="hidden text-sm font-semibold text-primary hover:underline sm:block">
            View all categories →
          </button>
        </div>

        {/* Categories grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <div
              key={category.title}
              style={{ animationDelay: `${index * 100}ms` }}
              className="animate-slide-in-up"
            >
              <CategoryCard {...category} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
