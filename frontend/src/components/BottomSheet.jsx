import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const BottomSheet = ({ open, onClose, title, children, testId }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        />
        <motion.div
          data-testid={testId}
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto max-w-2xl mx-auto shadow-[0_-8px_24px_rgba(40,44,63,0.15)]"
        >
          <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-3 pb-3 border-b border-gray-100 z-10">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-[#282C3F]">{title}</h3>
              <button data-testid={`${testId}-close`} onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} className="text-[#535766]" />
              </button>
            </div>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
