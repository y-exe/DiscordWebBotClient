import { useState, useEffect } from 'react';
import { FaXmark } from 'react-icons/fa6';

const ModalDialog = ({ modal, onSubmit, onClose }) => {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (modal?.components) {
      const initial = {};
      modal.components.forEach((row) => {
        if (row.components) {
          row.components.forEach((comp) => {
            if (comp.custom_id) {
              initial[comp.custom_id] = comp.value || '';
            }
          });
        }
      });
      // モーダルが開くたびに初期値を流し込む
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(initial);
    }
  }, [modal]);

  if (!modal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(modal.custom_id, values);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--app-surface-container-high)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-outline-variant)]">
          <h2 className="m-0 text-lg font-semibold text-[var(--app-on-surface)]">{modal.title}</h2>
          <button type="button" className="p-1 rounded-full hover:bg-white/10" onClick={onClose}>
            <FaXmark size={18} className="text-[var(--app-on-surface-variant)]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {modal.components?.map((row) => {
            if (row.type !== 1 || !row.components) return null;
            return row.components.map((comp) => (
              <div key={comp.custom_id} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--app-on-surface-variant)]">
                  {comp.label}
                  {comp.required && <span className="text-[var(--app-error)] ml-1">*</span>}
                </label>
                {comp.style === 2 ? (
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-[var(--app-surface-container-highest)] text-[var(--app-on-surface)] border border-[var(--app-outline)] focus:border-[var(--app-primary)] focus:outline-none resize-y"
                    placeholder={comp.placeholder}
                    value={values[comp.custom_id] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [comp.custom_id]: e.target.value }))}
                    maxLength={comp.max_length}
                    required={comp.required}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--app-surface-container-highest)] text-[var(--app-on-surface)] border border-[var(--app-outline)] focus:border-[var(--app-primary)] focus:outline-none"
                    placeholder={comp.placeholder}
                    value={values[comp.custom_id] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [comp.custom_id]: e.target.value }))}
                    maxLength={comp.max_length}
                    required={comp.required}
                  />
                )}
              </div>
            ));
          })}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-[var(--app-on-surface)] hover:bg-white/8 transition-colors"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--app-primary)] text-[var(--app-on-primary)] font-medium hover:opacity-90 transition-opacity"
            >
              {modal.button_label || '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalDialog;
