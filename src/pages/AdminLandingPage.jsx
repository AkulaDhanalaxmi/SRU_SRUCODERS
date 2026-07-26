import { useNavigate } from "react-router-dom";

export default function AdminLandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-white flex items-center justify-center p-0"
      onClick={() => navigate("/ops")}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          navigate("/ops");
        }
      }}
    >
      <img
        src="/products/adminland.png"
        alt="Admin landing page"
        className="h-auto max-h-[95vh] w-full max-w-full object-contain cursor-pointer"
      />
    </div>
  );
}
