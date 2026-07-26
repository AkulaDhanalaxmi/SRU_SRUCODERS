import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Upload, MessageSquare, Check, X, Zap, ShoppingBag } from "lucide-react";
import { Header } from "../components/Header";
import api from "../lib/api";
import VirtualTryOnService from "../services/VirtualTryOnService";
import { UploadBox, PreviewFrame } from "../components/FitCheckStudio";

const ANALYSIS_POINTS = [
  "Recommended Size",
  "Fit Analysis",
  "Body Proportion Match",
  "Colour Compatibility",
  "Fabric Drape Prediction",
  "Occasion Suitability",
  "Delivery Promise",
  "Trusted Seller",
  "Product Quality Summary",
];

export default function BuyReadyAIStudio() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSize, selectedColor, selectedImage, fitProfile } = location.state || {};
  const [product, setProduct] = useState(location.state?.product || null);

  const [uploadedImage, setUploadedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [originalThumbnail, setOriginalThumbnail] = useState(selectedImage || null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState(0);

  useEffect(() => {
    if (uploadedImage) {
      setOriginalThumbnail(uploadedImage === "avatar"
        ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80"
        : uploadedImage);
    }
  }, [uploadedImage]);

  useEffect(() => {
    if (product) return;
    if (!productId) {
      navigate("/");
      return;
    }

    const loadProduct = async () => {
      try {
        const { data } = await api.get(`/products/${productId}`);
        setProduct(data);
      } catch (error) {
        toast.error("Could not load product details for AI Studio.");
        navigate("/");
      }
    };

    loadProduct();
  }, [product, productId, navigate]);


  useEffect(() => {
    if (!product) {
      navigate("/");
    }
  }, [product, navigate]);

  const generatePreview = async (userImageData) => {
    setElapsedSeconds(0);
    setIsLoading(true);
    setFitResult(null);
    setGeneratedImage(null);

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const payload = {
      userImage: userImageData,
      productImage: selectedImage || product?.images?.[0] || null,
      fitProfile: fitProfile || null,
      selectedSize: selectedSize || null,
      selectedColor: selectedColor || null,
    };

    try {
      const response = await VirtualTryOnService.generateVirtualTryOn(payload);
      console.log("[AI Studio] virtual try-on response:", response);
      console.log("[AI Studio] response.generated_image:", response.generated_image);
      const generatedImageUrl = response.generated_image?.startsWith("/")
        ? `${process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000"}${response.generated_image}`
        : response.generated_image;
      setGeneratedImage(generatedImageUrl);
      setFitResult(response.fit_analysis);
    } catch (error) {
      toast.error("Unable to generate AI FitCheck preview. Please try again later.");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setUploadedImage(dataUrl);
        generatePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSaveLook = () => {
    toast.success("Saved to your lookbook!");
  };

  const handleTryAgain = () => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setFitResult(null);
  };

  const handleShopThisLook = () => {
    navigate(`/product/${productId}`);
  };

  const thumbnails = generatedImage
    ? [originalThumbnail, generatedImage, ...(product?.images || [])].filter(Boolean).slice(0, 4)
    : [];

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f5f5f6]">
        <Header />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <Header />

      <main className="mx-auto w-full max-w-full px-5 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-[14px] font-semibold text-[#7e7e7e] hover:text-[#282c3f] transition"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="mb-8">
          <h1 className="text-[32px] font-extrabold text-[#282c3f] mb-2">
            AI FitCheck Results
          </h1>
          <p className="text-[15px] text-[#7e7e7e] max-w-2xl">
            Generate a style preview for {product.name} and see fashion insights with a modern, responsive layout.
          </p>
        </div>

        {!uploadedImage && (
          <UploadBox
            uploadedImage={uploadedImage}
            handlePhotoUpload={handlePhotoUpload}
          />
        )}

        {uploadedImage && (
          <div className="mx-auto grid gap-6 justify-center max-w-[1520px] items-start px-4 lg:px-0">
            <div className="space-y-6 w-full">
              <PreviewFrame
                generatedImage={generatedImage}
                originalThumbnail={originalThumbnail}
                isLoading={isLoading}
                elapsedSeconds={elapsedSeconds}
                fitResult={fitResult}
                thumbnails={thumbnails}
                activeThumbnailIndex={activeThumbnailIndex}
                onSelectThumbnail={setActiveThumbnailIndex}
                onSave={handleSaveLook}
                onTryAgain={handleTryAgain}
                onShop={handleShopThisLook}
              />
            </div>
          </div>
        )}

        {/* Removed the extra recommendation section to keep AI Studio as a single compact page. */}
      </main>
    </div>
  );
}
