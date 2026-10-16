export const navigation = [
  ["Home", "/"],
  ["Services", "/services"],
  ["About", "/about"],
  ["Work", "/work"],
  ["Portfolio", "/portfolio"],
  ["Contact", "/contact"],
] as const;

export const services = [
  {
    slug: "web-development",
    name: "Web Development",
    short: "Web",
    icon: "⌘",
    description:
      "Fast, thoughtful experiences. Built for the way your business works.",
    details:
      "From the first interaction to the last API call, we build web products with equal attention to usability, accessibility, and architecture.",
    capabilities: [
      "Next.js & React",
      "SaaS platforms",
      "E-commerce",
      "Dashboards",
      "APIs",
      "Business websites",
    ],
  },
  {
    slug: "app-development",
    name: "App Development",
    short: "Apps",
    icon: "▣",
    description: "Useful in your hand. Seamless across screens.",
    details:
      "Purposeful mobile products that connect people to the things they need, with clear interfaces and dependable foundations.",
    capabilities: [
      "Cross-platform apps",
      "Mobile interfaces",
      "Authentication",
      "API integration",
      "Real-time systems",
    ],
  },
  {
    slug: "ai-automation",
    name: "AI Automation",
    short: "AI Automation",
    icon: "⌁",
    description: "Less repetitive work. More room for meaningful progress.",
    details:
      "We connect your tools and workflows with intelligent systems, keeping human oversight and measurable usefulness at the center.",
    capabilities: [
      "AI agents",
      "AI assistants",
      "Workflow automation",
      "LLM integration",
      "API automation",
      "Business automation",
    ],
  },
  {
    slug: "ai-vision",
    name: "AI Vision",
    short: "AI Vision",
    icon: "◎",
    description: "Turn visual information into clear, actionable signals.",
    details:
      "Computer vision systems that help teams understand images, inspect quality, and make sense of visual data.",
    capabilities: [
      "Computer vision",
      "Image classification",
      "Object detection",
      "Visual inspection",
      "Image processing",
    ],
  },
  {
    slug: "custom-software",
    name: "Custom Software Solutions",
    short: "Custom Software",
    icon: "⬡",
    description: "Your exact challenge. A carefully engineered solution.",
    details:
      "When an off-the-shelf tool does not fit, we design maintainable software around your operations and your next stage of growth.",
    capabilities: [
      "SaaS applications",
      "Internal systems",
      "Business software",
      "Backend platforms",
      "Cloud services",
    ],
  },
] as const;

export const projects = [
  {
    id: 1,
    title: "Nexa / Ops",
    category: "AI",
    categories: ["AI", "Automation", "Web"],
    type: "AI operations platform",
    description:
      "A command center for teams orchestrating AI workflows, approvals, and automations.",
    technologies: ["Next.js", "AI integration", "TypeScript"],
    image: "/projects/nexa.svg",
    slug: "nexa-ops",
    challenge:
      "Complex automation needs a clear place for people to understand what is happening and decide what happens next.",
    approach:
      "An overview-first dashboard pairs workflow health with explicit review states and readable activity trails.",
  },
  {
    id: 2,
    title: "Pulse / CRM",
    category: "Web",
    categories: ["Web", "Mobile"],
    type: "Customer intelligence",
    description:
      "A calm CRM concept that brings pipeline, activity, and customer signals into one readable view.",
    technologies: ["React", "Design system", "Data visualization"],
    image: "/projects/pulse.svg",
    slug: "pulse-crm",
    challenge:
      "Customer information loses its value when teams have to search through disconnected screens.",
    approach:
      "A shared overview and mobile companion concept organize customer signals around the next useful action.",
  },
  {
    id: 3,
    title: "Atlas / Cloud",
    category: "Web",
    categories: ["Web"],
    type: "Developer infrastructure",
    description:
      "Developer-facing infrastructure interface with quick observability, deployments and system status.",
    technologies: ["Web App", "Data UX", "Motion"],
    image: "/projects/atlas-cloud.svg",
    slug: "atlas-cloud",
    challenge:
      "Infrastructure tools need to help developers understand deployment progress, system health, and the next useful action without adding noise.",
    approach:
      "A focused deployment workspace brings build checks, observability, and system status into one readable interface, with calm motion that makes changes easy to follow.",
  },
] as const;
export type Project = (typeof projects)[number];
export const process = [
  [
    "Discover",
    "Understand before we build.",
    "We clarify the problem, research users, agree on scope, and define what a useful outcome looks like.",
  ],
  [
    "Design",
    "Make the complex feel simple.",
    "Research becomes journeys, prototypes, a thoughtful UI, and an architecture that supports the product.",
  ],
  [
    "Build",
    "Precision in every layer.",
    "We engineer the frontend, backend, and AI integrations in reviewable increments with regular demonstrations.",
  ],
  [
    "Test",
    "Confidence is part of the product.",
    "Functional QA, accessibility checks, and performance validation help catch the details before your users do.",
  ],
  [
    "Launch",
    "From idea to production.",
    "Deployment, monitoring, documentation, and a considered handover make launch a deliberate step.",
  ],
  [
    "Improve",
    "Good software keeps getting better.",
    "We use feedback, maintenance, and real usage to guide the next iteration.",
  ],
] as const;
