// @ts-nocheck
import React from 'react';
import { CadastrarLivroModal, NovoLivroData } from './CadastrarLivroModal';
import { Book } from '../types';

export interface RegisterBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterBook: (book: Book) => void;
  onSave?: (livro: NovoLivroData) => void;
}

export const RegisterBookModal: React.FC<RegisterBookModalProps> = ({
  isOpen,
  onClose,
  onRegisterBook,
  onSave,
}) => {
  return (
    <CadastrarLivroModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      onRegisterBook={onRegisterBook}
    />
  );
};

export default RegisterBookModal;
export { CadastrarLivroModal };
export type { NovoLivroData };
