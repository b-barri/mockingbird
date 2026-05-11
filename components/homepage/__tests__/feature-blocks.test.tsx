import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FEATURE_BLOCKS, FeatureBlocks } from "../feature-blocks";

describe("FeatureBlocks (R2 reading order discipline)", () => {
  it("ships exactly 4 blocks", () => {
    expect(FEATURE_BLOCKS).toHaveLength(4);
  });

  it("R2 reading order: voice → BYO key → framework probes → multi-provider", () => {
    expect(FEATURE_BLOCKS[0].title).toMatch(/voice-native/i);
    expect(FEATURE_BLOCKS[1].title).toMatch(/bring your own|byo/i);
    expect(FEATURE_BLOCKS[2].title).toMatch(/framework-aware/i);
    expect(FEATURE_BLOCKS[3].title).toMatch(/multi-provider/i);
  });

  it("each block's body copy is under 60 words (R2 discipline)", () => {
    for (const block of FEATURE_BLOCKS) {
      const wordCount = block.body.split(/\s+/).filter(Boolean).length;
      expect(
        wordCount,
        `"${block.title}" body has ${wordCount} words; cap is 60`
      ).toBeLessThanOrEqual(60);
    }
  });

  it("body copy avoids generic SaaS verbs", () => {
    const banned = /\b(streamline|supercharge|unlock|leverage|seamlessly|empower|delight)\b/i;
    for (const block of FEATURE_BLOCKS) {
      expect(
        block.body,
        `"${block.title}" body contains a banned generic SaaS verb`
      ).not.toMatch(banned);
    }
  });

  it("renders the blocks in order with data-order attribute", () => {
    render(<FeatureBlocks />);
    const blocks = screen.getAllByTestId(/feature-block-\d/);
    expect(blocks).toHaveLength(4);
    blocks.forEach((block, idx) => {
      expect(block).toHaveAttribute("data-order", String(idx + 1));
    });
  });
});
