import api from "../lib/api";

const providerDocs = {
  FASHN_AI: "https://fashn.ai",
  IDM_VTON: "https://idm-vton.example.com",
  CAT_VTON: "https://catvton.example.com",
  STABLE_DIFFUSION_VTON: "https://stablediffusion.example.com",
};

const createRequestPayload = ({ userImage, productImage, fitProfile, selectedSize, selectedColor }) => ({
  user_image: userImage,
  product_image: productImage,
  fit_profile: fitProfile,
  selected_size: selectedSize,
  selected_color: selectedColor,
});

const generateVirtualTryOn = async ({ userImage, productImage, fitProfile, selectedSize, selectedColor }) => {
  const payload = createRequestPayload({ userImage, productImage, fitProfile, selectedSize, selectedColor });

  // Virtual try-on can take 30-90+ seconds on the free/anonymous IDM-VTON
  // Hugging Face Space (queueing + cold start + diffusion inference), which
  // is well beyond the shared `api` instance's default 30s timeout used by
  // the rest of the app. Override it just for this call so a slow-but-still
  // -successful generation isn't cut off client-side while the backend is
  // still working.
  const { data } = await api.post('/ai/virtual-tryon', payload, {
    timeout: 150000, // 150s — comfortably covers cold-start + queue + inference
  });
  return data;
};

export default {
  generateVirtualTryOn,
  providerDocs,
};