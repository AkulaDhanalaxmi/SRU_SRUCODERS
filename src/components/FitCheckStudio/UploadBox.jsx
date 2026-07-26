import React from "react";

export default function UploadBox({
  uploadedImage,
  handlePhotoUpload,
}) {
  return (
    <div className="mb-8 rounded-[24px] border border-[#e6e6e6] bg-white/80 backdrop-blur-sm p-8 shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-[20px] font-bold text-[#282c3f] mb-2">Let's Get Started</h2>
        <p className="text-[14px] text-[#7e7e7e]">Upload your photo for an AI preview</p>
      </div>

      <div className="max-w-md mx-auto">
        <label className="group cursor-pointer">
          <div className="rounded-[16px] border-2 border-dashed border-[#d4d5d9] bg-[#f9f9fa] p-10 text-center hover:border-[#7c3aed] hover:bg-[#f5f0ff] transition">
            <div className="mx-auto mb-3 text-[#7c3aed]" style={{fontSize:36}}>⬆</div>
            <div className="text-[13px] font-semibold text-[#282c3f]">Upload Photo</div>
            <div className="mt-1 text-[11px] text-[#7e7e7e]">JPG, PNG up to 10MB</div>
          </div>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        </label>
      </div>
    </div>
  );
}
