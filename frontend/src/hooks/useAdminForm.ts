import { useState } from 'react';
import { apiFetch } from '../utils/apiClient';
import logger from '../utils/logger';

interface AdminFormEndpoints {
  create: string;
  update: (id: number) => string;
  delete: (id: number) => string;
}

interface UseAdminFormReturn<T> {
  formData: T;
  setFormData: (data: T) => void;
  editingId: number | null;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  submitting: boolean;
  resetForm: () => void;
  handleEditStart: (item: T & { id: number }) => void;
  handleCancel: () => void;
  handleFormChange: (field: keyof T, value: unknown) => void;
  handleSubmit: (onSuccess?: () => void) => Promise<void>;
  handleDelete: (id: number, onSuccess?: () => void) => Promise<void>;
}

/**
 * useAdminForm Hook
 * Reusable form state management for admin CRUD operations
 */
export const useAdminForm = <T extends Record<string, unknown>>(
  initialFormData: T,
  endpoints: AdminFormEndpoints
): UseAdminFormReturn<T> => {
  const [formData, setFormData] = useState<T>(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const resetForm = (): void => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowAddModal(false);
  };

  const handleEditStart = (item: T & { id: number }): void => {
    setEditingId(item.id);
    setFormData(item);
  };

  const handleCancel = (): void => {
    resetForm();
  };

  const handleFormChange = (field: keyof T, value: unknown): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (onSuccess?: () => void): Promise<void> => {
    setSubmitting(true);
    try {
      if (editingId) {
        // Update
        await apiFetch(endpoints.update(editingId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create
        await apiFetch(endpoints.create, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      resetForm();
      onSuccess?.();
    } catch (error) {
      logger.error(`Form submission error`, error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, onSuccess?: () => void): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(endpoints.delete(id), { method: 'DELETE' });
      onSuccess?.();
    } catch (error) {
      logger.error('Delete error', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    editingId,
    showAddModal,
    setShowAddModal,
    submitting,
    resetForm,
    handleEditStart,
    handleCancel,
    handleFormChange,
    handleSubmit,
    handleDelete
  };
};
