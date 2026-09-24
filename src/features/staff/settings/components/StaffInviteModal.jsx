import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'kitchen', label: 'Kitchen Staff' },
  { value: 'waiter', label: 'Waiter / Server' },
];

export function StaffInviteModal({
  isOpen,
  onClose,
  onInvite,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'waiter',
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) return;
    onInvite(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Staff Member"
      description="Create login credentials for a new team member. They'll receive a temporary password."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full Name"
          value={formData.fullName}
          onChange={handleChange('fullName')}
          placeholder="Rahul Kumar"
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          placeholder="rahul@restaurant.com"
          required
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={handleChange('role')}
          options={ROLE_OPTIONS}
        />

        <div className="p-3.5 rounded-xl bg-[#141721] border border-white/[0.08]">
          <p className="text-xs text-[#8A8F9C] leading-relaxed">
            <strong className="text-[#F4F5F7]">Note:</strong> A temporary password will be generated and
            shown to you after creation. Share it securely with the staff member
            so they can log in and change it.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} type="button" className="rounded-full text-[#8A8F9C] hover:text-[#F4F5F7]">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
            Create Staff Login
          </Button>
        </div>
      </form>
    </Modal>
  );
}
