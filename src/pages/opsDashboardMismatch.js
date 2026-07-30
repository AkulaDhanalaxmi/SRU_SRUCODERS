export function getVerificationMismatchState({ verificationComplete, verificationMatch, verificationResult }) {
  const hasProductReason = hasProductMismatchReason(verificationResult);
  const hasColorReason = hasColorMismatchReason(verificationResult);
  const productScore = typeof verificationResult?.product_match === "number" ? verificationResult.product_match : null;

  const mismatchProduct = Boolean(
    verificationComplete &&
      !verificationMatch &&
      (hasProductReason || (productScore !== null && productScore < 80 && verificationResult?.color_match !== false))
  );

  const mismatchColorOnly = Boolean(
    verificationComplete &&
      !verificationMatch &&
      verificationResult?.color_match === false &&
      !mismatchProduct
  );

  return { mismatchColorOnly, mismatchProduct };
}

function getMismatchReasons(verificationResult) {
  if (Array.isArray(verificationResult?.mismatch_reasons)) {
    return verificationResult.mismatch_reasons;
  }
  if (Array.isArray(verificationResult?.mismatchReasons)) {
    return verificationResult.mismatchReasons;
  }
  return [];
}

function hasProductMismatchReason(verificationResult) {
  const reasons = getMismatchReasons(verificationResult);

  return reasons.some((reason) => {
    const normalized = String(reason || "").toLowerCase();
    if (normalized.includes("color") || normalized.includes("shade") || normalized.includes("hue")) {
      return false;
    }
    return (
      normalized.includes("product type") ||
      normalized.includes("wrong product") ||
      normalized.includes("sku") ||
      normalized.includes("brand") ||
      normalized.includes("pattern") ||
      normalized.includes("accessor") ||
      normalized.includes("accessory")
    );
  });
}

function hasColorMismatchReason(verificationResult) {
  const reasons = getMismatchReasons(verificationResult);

  return reasons.some((reason) => {
    const normalized = String(reason || "").toLowerCase();
    return normalized.includes("color") || normalized.includes("shade") || normalized.includes("hue");
  });
}
