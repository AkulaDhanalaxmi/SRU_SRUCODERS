export function computeBuyReady({
  selectedSize,
  selectedPref,
  selectedDelivery,
  hasEvent = false,
  selectedDeliveryType = "standard",
  deliveryData = null,
  eventDate = null,
  evaluation = null,
}) {
  // Split fit evaluation into two separate signals:
  // 1) sizeSelectionScore — how good the user's selected size is relative to the AI recommendation
  // 2) productFitReliabilityScore — how reliable this product's sizing is overall (inconsistent sizing, returns, reviews)

  // Defaults
  const recommendedSize = evaluation?.recommended_size || null;
  const fit_confidence = typeof evaluation?.fit_confidence === "number" ? evaluation.fit_confidence : null;
  const size_accuracy = typeof evaluation?.size_accuracy === "number" ? evaluation.size_accuracy : 90;
  const return_risk = typeof evaluation?.return_risk === "number" ? evaluation.return_risk : (evaluation?.returnRisk ?? 8);

  // 1) Size Selection Score
  // If user selected the recommended size, treat selection as strong (score 100).
  // If not, derive selection score from fit_confidence when available, otherwise fallback heuristic.
  let sizeSelectionScore = 75;
  if (selectedSize && recommendedSize && selectedSize === recommendedSize) {
    sizeSelectionScore = 100;
  } else if (fit_confidence !== null) {
    sizeSelectionScore = fit_confidence;
  } else {
    // fallback heuristic: popular sizes M/L get a small boost
    sizeSelectionScore = (selectedSize === "M" || selectedSize === "L") ? 78 : 60;
  }

  // 2) Product Fit Reliability Score
  // Base on size accuracy and return risk (higher return risk reduces reliability).
  // This captures product-level issues (inconsistent sizing, frequent returns, review complaints).
  let productFitReliabilityScore = Math.max(0, Math.min(100, Math.round(size_accuracy - (return_risk - 5) * 0.6)));

  // Edge-case adjustments: if stock is zero or explicit flags exist on evaluation, penalize reliability
  const stockZero = evaluation && selectedSize && evaluation.size_stock && evaluation.size_stock[selectedSize] === 0;
  if (stockZero) productFitReliabilityScore = Math.max(0, productFitReliabilityScore - 12);

  // Decide fit item classification using both signals but avoid marking 'bad' solely when
  // the user has selected the recommended size. 'bad' should indicate severe product issues
  // or clear mismatch between selection and recommendation.
  let fitItem = "warn";

  if (selectedSize && recommendedSize && selectedSize === recommendedSize) {
    // Recommended size selected — rely on product-level reliability, but be conservative.
    if (productFitReliabilityScore >= 70) fitItem = "ok";
    else if (productFitReliabilityScore >= 45) fitItem = "warn";
    else {
      // Only mark 'bad' when product reliability is very poor (severe sizeAccuracy/return risk)
      fitItem = "bad"; // treat as real product risk
    }
  } else {
    // User selected a non-recommended size — selection confidence matters strongly.
    if (sizeSelectionScore >= 70) fitItem = "ok";
    else if (sizeSelectionScore >= 50) fitItem = "warn";
    else fitItem = "bad";
  }

  const items = {
    fit: fitItem,
    delivery: "ok",
    quality: "ok",
    returns: selectedPref === "gift" ? "warn" : "ok",
  };

  if (selectedPref === "event" && hasEvent && deliveryData?.options?.length) {
    const selected = deliveryData.options.find((option) => option.type === selectedDeliveryType) || deliveryData.options[0];
    const selectedDays = Number(selected?.days ?? 0);
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    const bufferDays = Math.ceil((eventDateObj - today) / (1000 * 60 * 60 * 24));

    if (selectedDays > bufferDays) {
      items.delivery = "warn";
    }
  }

  const warnCount = Object.values(items).filter((v) => v === "warn").length;
  const badCount = Object.values(items).filter((v) => v === "bad").length;

  let level = "ready";
  if (badCount > 0) level = "risk";
  else if (warnCount >= 2) level = "review";
  else if (warnCount === 1) level = "almost";

  return { level, items };
}
