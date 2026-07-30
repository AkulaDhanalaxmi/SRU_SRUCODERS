import { getVerificationMismatchState } from "./opsDashboardMismatch";

describe("getVerificationMismatchState", () => {
  it("shows color mismatch when product matches but color does not", () => {
    const state = getVerificationMismatchState({
      verificationComplete: true,
      verificationMatch: false,
      verificationResult: {
        color_match: false,
        product_match: 100,
        mismatch_reasons: ["Wrong Color"],
      },
    });

    expect(state.mismatchColorOnly).toBe(true);
    expect(state.mismatchProduct).toBe(false);
  });

  it("supports mismatchReasons field name from backend payload", () => {
    const state = getVerificationMismatchState({
      verificationComplete: true,
      verificationMatch: false,
      verificationResult: {
        color_match: false,
        product_match: 65.5,
        mismatchReasons: ["Wrong Product Color"],
      },
    });

    expect(state.mismatchColorOnly).toBe(true);
    expect(state.mismatchProduct).toBe(false);
  });

  it("keeps explicit product mismatch reasons as product mismatch when color is not mismatched", () => {
    const state = getVerificationMismatchState({
      verificationComplete: true,
      verificationMatch: false,
      verificationResult: {
        color_match: true,
        product_match: 72,
        mismatch_reasons: ["Wrong Product Type"],
      },
    });

    expect(state.mismatchColorOnly).toBe(false);
    expect(state.mismatchProduct).toBe(true);
  });

  it("shows color mismatch when reason is explicitly color-only even with low product score", () => {
    const state = getVerificationMismatchState({
      verificationComplete: true,
      verificationMatch: false,
      verificationResult: {
        color_match: false,
        product_match: 49.2,
        mismatch_reasons: ["Wrong Color"],
      },
    });

    expect(state.mismatchColorOnly).toBe(true);
    expect(state.mismatchProduct).toBe(false);
  });

  it("prefers product mismatch when both product and color mismatches are present", () => {
    const state = getVerificationMismatchState({
      verificationComplete: true,
      verificationMatch: false,
      verificationResult: {
        color_match: false,
        product_match: 72,
        mismatch_reasons: ["Wrong Product Type"],
      },
    });

    expect(state.mismatchColorOnly).toBe(false);
    expect(state.mismatchProduct).toBe(true);
  });

  it("shows color mismatch when mismatch reason is only color-related", () => {
    const state = getVerificationMismatchState({
      verificationComplete: true,
      verificationMatch: false,
      verificationResult: {
        color_match: false,
        product_match: 65.5,
        mismatch_reasons: ["Wrong Product Color"],
      },
    });

    expect(state.mismatchColorOnly).toBe(true);
    expect(state.mismatchProduct).toBe(false);
  });
});
