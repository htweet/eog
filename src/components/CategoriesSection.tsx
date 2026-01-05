import { Car, Home, Smartphone, Package } from "lucide-react";
import { CategoryCard } from "./CategoryCard";

const categories = [
  {
    title: "Automobiles",
    description: "Verify vehicles before purchase. Check condition, mileage, and documentation.",
    icon: Car,
    category: "auto" as const,
    bountyCount: 124,
  },
  {
    title: "Real Estate",
    description: "Tour apartments and properties remotely. Verify listings are real.",
    icon: Home,
    category: "realestate" as const,
    bountyCount: 89,
  },
  {
    title: "Electronics",
    description: "Confirm devices work before buying. Test screens, batteries, and more.",
    icon: Smartphone,
    category: "electronics" as const,
    bountyCount: 67,
  },
  {
    title: "General Items",
    description: "Verify furniture, collectibles, or any item. If it exists, we can vouch for it.",
    icon: Package,
    category: "general" as const,
    bountyCount: 203,
  },
];

export function CategoriesSection() {
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
