import { useState } from 'react';
import MessageModal from '../components/base/MessageModal';

type ModalType = 'success' | 'error';

export default function useAlertModal() {
  const [state, setState] = useState<{
    title: string;
    message: string;
    type: ModalType;
  } | null>(null);

  const show = (title: string, message: string, type: ModalType) => {
    setState({ title, message, type });
  };

  const modal = state ? (
    <MessageModal
      isOpen={true}
      onClose={() => setState(null)}
      title={state.title}
      message={state.message}
      type={state.type}
    />
  ) : null;

  return { show, modal };
}
