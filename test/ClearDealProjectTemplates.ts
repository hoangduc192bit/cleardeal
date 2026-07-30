import { expect } from "chai";

import {
  clearDealProjectTemplates,
  clearDealTemplate,
  templateMilestones,
} from "../lib/cleardeal-project-templates.ts";
import { normalizeDealMetadata } from "../lib/cleardeal-metadata.ts";

describe("ClearDeal project templates", function () {
  it("offers practical templates and a blank custom option", function () {
    expect(clearDealProjectTemplates.map((template) => template.id)).to.deep.equal([
      "website",
      "video",
      "design",
      "software",
      "custom",
    ]);
    expect(clearDealTemplate("video").milestones).to.have.length(3);
    expect(clearDealTemplate("custom").milestones).to.have.length(1);
  });

  it("creates dated delivery steps with plain-language approval checks", function () {
    const now = Date.parse("2026-07-31T00:00:00Z");
    const milestones = templateMilestones("website", now);
    expect(milestones[0].dueDate).to.equal("2026-08-07");
    expect(milestones[1].dueDate).to.equal("2026-08-21");
    expect(milestones.every((milestone) => milestone.deliverable)).to.equal(true);
    expect(
      milestones.every((milestone) => milestone.acceptanceCriteria),
    ).to.equal(true);
  });

  it("produces metadata accepted by the public metadata validator", function () {
    const template = clearDealTemplate("software");
    const metadata = normalizeDealMetadata({
      version: 2,
      client: "Northstar Studio",
      team: "Saigon Digital",
      title: template.projectTitle,
      category: template.category,
      summary: template.projectSummary,
      milestones: templateMilestones(
        "software",
        Date.parse("2026-07-31T00:00:00Z"),
      ).map(({ title, dueDate, deliverable, acceptanceCriteria }) => ({
        title,
        dueDate,
        deliverable,
        acceptanceCriteria,
      })),
    });
    expect(metadata).not.to.equal(null);
    expect(metadata?.version).to.equal(2);
  });
});
