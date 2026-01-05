import { FileText, UserCheck, Video, DollarSign } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Post Your Request",
    description: "Describe what you need verified. Our AI generates a smart checklist.",
    color: "text-category-auto",
    bg: "bg-category-auto-light",
  },
  {
    icon: UserCheck,
    title: "Voucher Accepts",
    description: "A verified local agent near the location picks up your task.",
    color: "text-category-realestate",
    bg: "bg-category-realestate-light",
  },
  {
    icon: Video,
    title: "Live Verification",
    description: "Watch real-time video with GPS stamp. No pre-recorded content.",
    color: "text-category-electronics",
    bg: "bg-category-electronics-light",
  },
  {
    icon: DollarSign,
    title: "Secure Payment",
    description: "Funds release from escrow only when you're satisfied.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 bg-secondary/50">
      <div className="container">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
            How Vouch Works
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            A simple 4-step process to verify anything, anywhere
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-12 hidden h-0.5 w-3/4 -translate-x-1/2 bg-border lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                  {index + 1}
                </div>

                {/* Icon */}
                <div
                  className={`mb-4 flex h-24 w-24 items-center justify-center rounded-2xl ${step.bg}`}
                >
                  <step.icon className={`h-10 w-10 ${step.color}`} />
                </div>

                {/* Content */}
                <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
