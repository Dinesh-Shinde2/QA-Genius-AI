import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 shadow-xl w-full max-w-sm p-6 rounded-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 font-medium">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-5 py-2 text-sm font-bold text-white rounded-xl transition shadow-sm ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#2F81F7] hover:bg-blue-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
