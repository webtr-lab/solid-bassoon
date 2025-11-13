import { useState } from 'react';
import { apiFetch, getErrorMessage } from '../utils/apiClient';
import logger from '../utils/logger';

/**
 * useAdminForm Hook
 * Reusable form state management for admin CRUD operations
 */
export const useAdminForm = (initialFormData, endpoints) => {
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowAddModal(false);
  };

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setFormData(item);
  };

  const handleCancel = () => {
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (onSuccess) => {
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

  const handleDelete = async (id, onSuccess) => {
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
