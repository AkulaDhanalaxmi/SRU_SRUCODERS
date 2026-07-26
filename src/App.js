import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ShopProvider } from "./context/ShopContext";
import AuthPage from "./pages/AuthPage";
import FitProfileSetup from "./pages/FitProfileSetup";
import OnboardingFlow from "./pages/OnboardingFlow";
import HomePage from "./pages/HomePage";
import ListingPage from "./pages/ListingPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import WishlistPage from "./pages/WishlistPage";
import BagPage from "./pages/BagPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import BuyReadyAIStudio from "./pages/BuyReadyAIStudio";
import OpsDashboardPage from "./pages/OpsDashboardPage";
import AdminLandingPage from "./pages/AdminLandingPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#FF3E6C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user === false) return <Navigate to="/auth" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ShopProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/register" element={<Navigate to="/auth" replace />} />
              <Route path="/fit-setup" element={<Protected><FitProfileSetup /></Protected>} />
              <Route path="/onboarding" element={<Protected><OnboardingFlow /></Protected>} />
              <Route path="/" element={<Protected><HomePage /></Protected>} />
              <Route path="/products" element={<Protected><ListingPage /></Protected>} />
              <Route path="/product/:id" element={<Protected><ProductDetailPage /></Protected>} />
              <Route path="/buyready-ai-studio/:productId?" element={<Protected><BuyReadyAIStudio /></Protected>} />
              <Route path="/wishlist" element={<Protected><WishlistPage /></Protected>} />
              <Route path="/bag" element={<Protected><BagPage /></Protected>} />
              <Route path="/checkout" element={<Protected><CheckoutPage /></Protected>} />
              <Route path="/order-success/:id" element={<Protected><OrderSuccessPage /></Protected>} />
              <Route path="/track/:id" element={<Protected><TrackOrderPage /></Protected>} />
              <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
              <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
              <Route path="/ops/verify/:orderId" element={<Protected><OpsDashboardPage /></Protected>} />
              <Route path="/admin-landing" element={<Protected><AdminLandingPage /></Protected>} />
              <Route path="/ops" element={<Protected><OpsDashboardPage /></Protected>} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </ShopProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
