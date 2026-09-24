import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';

export function CategoryForm({
  isOpen,
  onClose,
  onSave,
  category = null,
  isLoading = false,
}) {
  const isEdit = !!category;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        is_active: category.is_active ?? true,
      });
    } else {
      setFormData({ name: '', description: '', is_active: true });
    }
  }, [category, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'New Menu Category'}
      description={
        isEdit
          ? 'Update the category name and visibility.'
          : 'Add a new menu category to organize your dishes.'
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Category Name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g. Appetizers, Signature Mains, Cocktails"
          required
        />

        <Input
          label="Description (optional)"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Short subtitle shown below the category name"
        />

        <Toggle
          checked={formData.is_active}
          onChange={(val) =>
            setFormData((prev) => ({ ...prev, is_active: val }))
          }
          label="Active"
          description="Hidden categories won't appear on the guest menu"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} type="button" className="rounded-full text-[#8A8F9C] hover:text-[#F4F5F7]">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
            {isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
