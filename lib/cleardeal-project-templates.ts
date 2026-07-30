import type { ClearDealProjectCategory } from "@/lib/cleardeal-metadata";

export type ClearDealTemplateId =
  | "website"
  | "video"
  | "design"
  | "software"
  | "custom";

export interface ClearDealProjectTemplate {
  id: ClearDealTemplateId;
  category: ClearDealProjectCategory;
  name: string;
  description: string;
  projectTitle: string;
  projectSummary: string;
  reviewHours: number;
  maxRevisions: number;
  milestones: Array<{
    title: string;
    amount: string;
    dueAfterDays: number;
    deliverable: string;
    acceptanceCriteria: string;
  }>;
}

export const clearDealProjectTemplates: ClearDealProjectTemplate[] = [
  {
    id: "website",
    category: "Website development",
    name: "Website project",
    description: "Design, build, and hand over a business website in three protected payments.",
    projectTitle: "Business website launch",
    projectSummary:
      "Design and deliver a production-ready responsive website, including the agreed pages, content management access, and final source handoff.",
    reviewHours: 72,
    maxRevisions: 2,
    milestones: [
      {
        title: "UX and visual design",
        amount: "0.6",
        dueAfterDays: 7,
        deliverable: "Responsive page designs and an interactive prototype.",
        acceptanceCriteria:
          "The prototype includes every agreed page, uses the approved brand assets, and can be reviewed on desktop and mobile.",
      },
      {
        title: "Working website",
        amount: "1.4",
        dueAfterDays: 21,
        deliverable: "A deployed staging website with the agreed pages and forms.",
        acceptanceCriteria:
          "All agreed pages load on mobile and desktop, navigation works, and the contact form submits successfully.",
      },
      {
        title: "Production handoff",
        amount: "1",
        dueAfterDays: 30,
        deliverable: "Production deployment, source code, and administrator handoff.",
        acceptanceCriteria:
          "The production URL is live and the client receives working source and administrator access.",
      },
    ],
  },
  {
    id: "video",
    category: "Video production",
    name: "Video production",
    description: "Protect the concept, first cut, and clean master file separately.",
    projectTitle: "Promotional video production",
    projectSummary:
      "Produce a short promotional video from an approved concept through final color, sound, captions, and clean master delivery.",
    reviewHours: 48,
    maxRevisions: 2,
    milestones: [
      {
        title: "Concept and storyboard",
        amount: "0.4",
        dueAfterDays: 4,
        deliverable: "Creative concept, script, and scene-by-scene storyboard.",
        acceptanceCriteria:
          "The concept follows the brief, includes the required message, and fits the agreed runtime.",
      },
      {
        title: "Watermarked first cut",
        amount: "0.8",
        dueAfterDays: 10,
        deliverable: "A review-ready first cut with watermark and temporary audio mix.",
        acceptanceCriteria:
          "The cut follows the approved storyboard and includes every required scene, logo, and call to action.",
      },
      {
        title: "Clean master delivery",
        amount: "0.3",
        dueAfterDays: 14,
        deliverable: "Final clean MP4 master and agreed social-media exports.",
        acceptanceCriteria:
          "The files match the agreed resolution, aspect ratios, captions, audio level, and contain no review watermark.",
      },
    ],
  },
  {
    id: "design",
    category: "Brand and design",
    name: "Brand and design",
    description: "Move from creative direction to approved assets and editable source files.",
    projectTitle: "Brand identity package",
    projectSummary:
      "Create a practical brand identity covering creative direction, core visual assets, and editable production files.",
    reviewHours: 72,
    maxRevisions: 2,
    milestones: [
      {
        title: "Creative direction",
        amount: "0.3",
        dueAfterDays: 5,
        deliverable: "Moodboard, visual direction, color direction, and type direction.",
        acceptanceCriteria:
          "The direction responds to the approved brief and is presented clearly enough for the client to choose one route.",
      },
      {
        title: "Core brand assets",
        amount: "0.5",
        dueAfterDays: 12,
        deliverable: "Approved logo system, color palette, and typography rules.",
        acceptanceCriteria:
          "The final direction includes the agreed logo variants and passes the stated usage requirements.",
      },
      {
        title: "Source file handoff",
        amount: "0.2",
        dueAfterDays: 16,
        deliverable: "Editable source files, exports, and a concise usage guide.",
        acceptanceCriteria:
          "Every agreed source and export format opens correctly and the usage guide explains the core rules.",
      },
    ],
  },
  {
    id: "software",
    category: "Software delivery",
    name: "Software delivery",
    description: "Tie payments to a tested build, staging release, and production handoff.",
    projectTitle: "Software feature delivery",
    projectSummary:
      "Design, implement, test, and hand over a production software feature with clear acceptance checks.",
    reviewHours: 72,
    maxRevisions: 2,
    milestones: [
      {
        title: "Scope and technical plan",
        amount: "0.5",
        dueAfterDays: 7,
        deliverable: "Confirmed user flow, technical plan, and acceptance checklist.",
        acceptanceCriteria:
          "The plan covers the agreed user flow, data changes, main risks, and testable acceptance conditions.",
      },
      {
        title: "Staging implementation",
        amount: "1.5",
        dueAfterDays: 21,
        deliverable: "Feature deployed to staging with automated and manual test evidence.",
        acceptanceCriteria:
          "Every acceptance check passes on staging and no blocking defect remains open.",
      },
      {
        title: "Production handoff",
        amount: "1",
        dueAfterDays: 30,
        deliverable: "Production release, source changes, and operating documentation.",
        acceptanceCriteria:
          "The release is live, monitored, documented, and the client can operate or maintain the delivered feature.",
      },
    ],
  },
  {
    id: "custom",
    category: "Custom project",
    name: "Start from scratch",
    description: "Define your own scope, milestones, prices, and acceptance rules.",
    projectTitle: "",
    projectSummary: "",
    reviewHours: 72,
    maxRevisions: 2,
    milestones: [
      {
        title: "",
        amount: "",
        dueAfterDays: 14,
        deliverable: "",
        acceptanceCriteria: "",
      },
    ],
  },
];

export function clearDealTemplate(templateId: ClearDealTemplateId) {
  return (
    clearDealProjectTemplates.find((template) => template.id === templateId) ??
    clearDealProjectTemplates[0]
  );
}

export function dateAfterDays(days: number, now = Date.now()) {
  return new Date(now + days * 86_400_000).toISOString().slice(0, 10);
}

export function templateMilestones(
  templateId: ClearDealTemplateId,
  now = Date.now(),
) {
  return clearDealTemplate(templateId).milestones.map((milestone) => ({
    title: milestone.title,
    amount: milestone.amount,
    dueDate: dateAfterDays(milestone.dueAfterDays, now),
    deliverable: milestone.deliverable,
    acceptanceCriteria: milestone.acceptanceCriteria,
  }));
}
