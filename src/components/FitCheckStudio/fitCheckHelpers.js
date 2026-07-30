const CATEGORY_CONFIG = {
  dress: {
    whenToWear: ["Party", "Wedding", "Dinner", "Date Night"],
    styleSuggestions: [
      { title: "Earrings", icon: "💎" },
      { title: "Heels", icon: "👠" },
      { title: "Clutch", icon: "👜" },
      { title: "Bracelet", icon: "📿" },
    ],
    summary: (product, score) => {
      const fabric = product?.fabric ? `${product.fabric.toLowerCase()} fabric` : "fabric";
      if (score >= 85) {
        return `The dress fits well around the waist with a comfortable length. The ${fabric} drapes naturally on your body.`;
      }
      if (score >= 65) {
        return `The dress feels mostly true to size, with a pleasant length and a good waist fit. The ${fabric} drapes nicely.`;
      }
      return `The dress may feel a bit snug at the waist or slightly longer than expected. Consider a size change if you prefer extra ease.`;
    },
  },
  tshirt: {
    whenToWear: ["Casual", "Street", "Weekend", "Travel"],
    styleSuggestions: [
      { title: "Sneakers", icon: "👟" },
      { title: "Jeans", icon: "👖" },
      { title: "Watch", icon: "⌚" },
      { title: "Cap", icon: "🧢" },
    ],
    summary: (product, score) => {
      const style = product?.fit_type?.toLowerCase().includes("oversized") ? "relaxed style" : "regular fit";
      if (score >= 85) {
        return `This ${style} matches the intended relaxed style. Sleeves and shoulder width look balanced.`;
      }
      if (score >= 65) {
        return `The tee is near the right fit, but the shoulders may feel a little tight or loose depending on your preferred look.`;
      }
      return `The fit may be too snug or too loose for this tee. Check if a size up or down gives a better shoulder fit.`;
    },
  },
  shirt: {
    whenToWear: ["Office", "Meetings", "Interviews", "Business Travel"],
    styleSuggestions: [
      { title: "Trousers", icon: "👔" },
      { title: "Loafers", icon: "👞" },
      { title: "Belt", icon: "🧷" },
      { title: "Watch", icon: "⌚" },
    ],
    summary: (product, score) => {
      if (score >= 85) {
        return `The shirt sits cleanly in the shoulders and chest. The length is good for both tucking and wearing untucked.`;
      }
      if (score >= 65) {
        return `The shirt is a decent fit, though the sleeve length may be slightly off for a polished look.`;
      }
      return `The shirt may feel tight around the chest or too loose through the torso. Adjust the size for a smarter fit.`;
    },
  },
  kurti: {
    whenToWear: ["College", "Festival", "Casual", "Family Gathering"],
    styleSuggestions: [
      { title: "Jhumkas", icon: "🪔" },
      { title: "Dupatta", icon: "🧣" },
      { title: "Sandals", icon: "🩴" },
      { title: "Handbag", icon: "👜" },
    ],
    summary: (product, score) => {
      if (score >= 85) {
        return `The kurti has a well-proportioned fit with comfortable ease. The length and sleeve shape look flattering.`;
      }
      if (score >= 65) {
        return `The kurti is mostly comfortable, although the shoulder or hip area may need a small adjustment.`;
      }
      return `The kurti may feel a bit snug around the bust or hips. Consider the next size if you prefer extra room.`;
    },
  },
  jeans: {
    whenToWear: ["Casual", "Work", "Travel", "Weekend"],
    styleSuggestions: [
      { title: "Sneakers", icon: "👟" },
      { title: "T-shirt", icon: "👕" },
      { title: "Belt", icon: "🧷" },
      { title: "Watch", icon: "⌚" },
    ],
    summary: (product, score) => {
      if (score >= 85) {
        return `The waist and hip fit look accurate. The leg length is suitable for your height.`;
      }
      if (score >= 65) {
        return `The jeans fit reasonably well, though the waist or thigh area may feel slightly tighter than expected.`;
      }
      return `The jeans may be too tight around the waist or legs, or the length may need adjustment for a cleaner look.`;
    },
  },
  gym: {
    whenToWear: ["Workout", "Running", "Yoga", "Travel"],
    styleSuggestions: [
      { title: "Sneakers", icon: "👟" },
      { title: "Water Bottle", icon: "💧" },
      { title: "Gym Shorts", icon: "🩳" },
      { title: "Cap", icon: "🧢" },
    ],
    summary: (product, score) => {
      if (score >= 85) {
        return `The activewear offers good mobility and a comfortable fit for your workout routine.`;
      }
      if (score >= 65) {
        return `The gym wear is mostly comfortable. It may feel a bit snug in certain movement areas.`;
      }
      return `The activewear may restrict some movement or feel too loose for high-intensity activity.`;
    },
  },
  default: {
    whenToWear: ["Casual", "Smart Casual", "Everyday", "Travel"],
    styleSuggestions: [
      { title: "Sneakers", icon: "👟" },
      { title: "Watch", icon: "⌚" },
      { title: "Bag", icon: "👜" },
      { title: "Sunglasses", icon: "🕶" },
    ],
    summary: (product, score) => {
      if (score >= 85) {
        return `The item fits well for its intended style. It looks balanced and comfortable on you.`;
      }
      if (score >= 65) {
        return `The fit is generally good, but some minor adjustments could make it feel more polished.`;
      }
      return `The fit may need a small size adjustment to feel more comfortable and look more tailored.`;
    },
  },
};

const COLOR_HARMONY_MAP = {
  navy: ["White", "Beige", "Grey", "Light Blue", "Silver"],
  blue: ["White", "Beige", "Grey", "Light Blue", "Silver"],
  pink: ["White", "Black", "Nude", "Gold", "Cream"],
  red: ["Black", "White", "Gold", "Beige", "Nude"],
  black: ["White", "Grey", "Red", "Beige", "Gold"],
  white: ["Black", "Navy", "Beige", "Grey", "Pastel Blue"],
  green: ["White", "Beige", "Brown", "Gold", "Nude"],
  grey: ["White", "Black", "Navy", "Mustard", "Burgundy"],
  yellow: ["White", "Navy", "Brown", "Green", "Denim"],
  beige: ["White", "Brown", "Olive", "Gold", "Cream"],
};

const getCategoryKey = (product) => {
  const text = `${product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(dress|gown|saree|lehenga|skirt)/.test(text)) return "dress";
  if (/(t[- ]?shirt|tee|top)/.test(text)) return "tshirt";
  if (/(shirt|blouse)/.test(text)) return "shirt";
  if (/(kurti|kurta|ethnic)/.test(text)) return "kurti";
  if (/(jean|denim|pants|trouser|chino)/.test(text)) return "jeans";
  if (/(gym|workout|active|athletic|sports)/.test(text)) return "gym";
  return "default";
};

const getDominantColor = (product, selectedColor) => {
  const colorSource = selectedColor || product?.color || product?.colors?.[0] || "Navy";
  return String(colorSource).trim();
};

const resolveColorHarmony = (color) => {
  const target = color.toLowerCase();
  for (const key of Object.keys(COLOR_HARMONY_MAP)) {
    if (target.includes(key)) {
      return COLOR_HARMONY_MAP[key];
    }
  }
  return ["White", "Black", "Beige", "Grey", "Gold"];
};

export const getFitLabel = (score) => {
  if (score === null || score === undefined) return "No score";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Great";
  if (score >= 50) return "Good";
  return "Needs Review";
};

export const getFitSummary = (product, fitResult, selectedColor) => {
  const score = fitResult?.confidence ?? fitResult?.fit_confidence ?? fitResult?.analysis?.fit_confidence ?? null;
  const category = getCategoryKey(product);
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.default;
  const summary = config.summary(product, score);
  const whenToWear = config.whenToWear;
  const styleSuggestions = config.styleSuggestions;
  const dominantColor = getDominantColor(product, selectedColor);
  const colorHarmony = resolveColorHarmony(dominantColor);

  return {
    score,
    summary,
    whenToWear,
    styleSuggestions,
    colorHarmony,
    dominantColor,
  };
};
