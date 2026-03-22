import { useEffect, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Voucher {
  id: string;
  code: string;
  description: string | null; // Add description field
  discount_type: 'percentage' | 'fixed_amount';
  value: string; // Use string to handle Decimal from backend
  plan_id: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number; // Add used_count field
  is_active: boolean;
  created_at: string;
}

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const fetchVouchers = async () => {
    try {
      const data = await apiClient.get<Voucher[]>('/admin/vouchers');
      setVouchers(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const openModal = (voucher: Voucher | null = null) => {
    setSelectedVoucher(voucher);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVoucher(null);
  };

  const handleSave = async (voucherData: Partial<Voucher>) => {
    try {
      if (selectedVoucher) {
        await apiClient.put(`/admin/vouchers/${selectedVoucher.id}`, voucherData);
        toast.success('Voucher updated successfully');
      } else {
        await apiClient.post('/admin/vouchers', voucherData);
        toast.success('Voucher created successfully');
      }
      fetchVouchers();
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save voucher');
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (window.confirm('Are you sure you want to delete this voucher? This action cannot be undone.')) {
      try {
        await apiClient.delete(`/admin/vouchers/${voucherId}`);
        toast.success('Voucher deleted successfully');
        fetchVouchers();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete voucher');
      }
    }
  };

  return (
    <div className="mock-page">
      <div className="mock-page__main">
        <section className="mock-feed-card">
          <div className="mock-feed-card__header">
            <div>
              <h2>Voucher Management</h2>
              <p>Create and manage discount codes for plans and subscriptions.</p>
            </div>
            <div className="mock-toolbar">
              <button type="button" onClick={fetchVouchers} className="mock-toolbar-button">
                <RefreshCcw size={15} />
                Refresh
              </button>
              <button type="button" className="mock-action-solid" onClick={() => openModal()}>
                <Plus size={14} />
                Create Voucher
              </button>
            </div>
          </div>
          {loading ? (
            <div className="mock-empty-state">
              <strong>Loading vouchers</strong>
              <p>Fetching discount codes.</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="mock-empty-state">
              <strong>No vouchers found</strong>
              <p>Create the first voucher to offer discounts.</p>
            </div>
          ) : (
            <div className="mock-table-wrap">
              <table className="mock-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Plan</th>
                    <th>Expires</th>
                    <th>Used</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="mock-table-row--clickable" onClick={() => openModal(voucher)}>
                      <td>
                        <strong>{voucher.code}</strong>
                        <p>ID {voucher.id.slice(0, 8)}</p>
                      </td>
                      <td>{voucher.description || '—'}</td>
                      <td>{voucher.discount_type}</td>
                      <td>{voucher.value} {voucher.discount_type === 'percentage' ? '%' : 'GBP'}</td>
                      <td>{voucher.plan_id ? `Plan ID ${voucher.plan_id.slice(0,8)}` : 'Any Plan'}</td>
                      <td>{voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString() : 'Never'}</td>
                      <td>{voucher.used_count} / {voucher.max_uses ? voucher.max_uses : '∞'}</td>
                      <td>{voucher.is_active ? 'Yes' : 'No'}</td>
                      <td>
                        <div className="mock-list-row__actions">
                            <button type="button" className="mock-toolbar-button" onClick={(e) => { e.stopPropagation(); openModal(voucher); }}>Edit</button>
                            <button type="button" className="mock-toolbar-button mock-toolbar-button--danger" onClick={(e) => { e.stopPropagation(); handleDelete(voucher.id); }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {isModalOpen && (
          <VoucherForm
            voucher={selectedVoucher}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-component for the Voucher Form ────────────────────────────────────────

interface VoucherFormProps {
  voucher: Voucher | null;
  onSave: (voucherData: Partial<Voucher>) => void;
  onClose: () => void;
}

function VoucherForm({ voucher, onSave, onClose }: VoucherFormProps) {
  const [formData, setFormData] = useState({
    code: voucher?.code || '',
    description: voucher?.description || '', // Add description field
    discount_type: voucher?.discount_type || 'percentage',
    value: voucher?.value || '0.00',
    plan_id: voucher?.plan_id || '',
    expires_at: voucher?.expires_at ? voucher.expires_at.split('T')[0] : '', // Format for date input
    max_uses: voucher?.max_uses || null,
    used_count: voucher?.used_count || 0, // Add used_count field, not editable
    is_active: voucher?.is_active ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' && value !== '') ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="mock-modal-overlay">
      <div className="mock-modal">
        <div className="mock-modal__header">
          <h2>{voucher ? 'Edit Voucher' : 'Create Voucher'}</h2>
          <p>Define a new discount code for your plans.</p>
        </div>
        <form onSubmit={handleSubmit} className="mock-modal__body">
          <div className="mock-form-group">
            <label htmlFor="code">Voucher Code</label>
            <input type="text" id="code" name="code" value={formData.code} onChange={handleChange} required />
          </div>
          <div className="mock-form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
          </div>
          <div className="mock-form-group">
            <label htmlFor="discount_type">Discount Type</label>
            <select id="discount_type" name="discount_type" value={formData.discount_type} onChange={handleChange}>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </select>
          </div>
          <div className="mock-form-group">
            <label htmlFor="value">Value</label>
            <input type="text" id="value" name="value" value={formData.value} onChange={handleChange} required />
          </div>
          <div className="mock-form-group">
            <label htmlFor="plan_id">Apply to Plan ID (optional)</label>
            <input type="text" id="plan_id" name="plan_id" value={formData.plan_id} onChange={handleChange} placeholder="UUID of a specific plan" />
          </div>
          <div className="mock-form-group">
            <label htmlFor="expires_at">Expires At (optional)</label>
            <input type="date" id="expires_at" name="expires_at" value={formData.expires_at} onChange={handleChange} />
          </div>
          <div className="mock-form-group">
            <label htmlFor="max_uses">Maximum Uses (optional)</label>
            <input type="number" id="max_uses" name="max_uses" value={formData.max_uses === null ? '' : formData.max_uses} onChange={handleChange} />
          </div>
          <div className="mock-form-group mock-form-group--inline">
            <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} />
            <label htmlFor="is_active">Is Active</label>
          </div>
          <div className="mock-modal__footer">
            <button type="button" className="mock-toolbar-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mock-action-solid">Save Voucher</button>
          </div>
        </form>
      </div>
    </div>
  );
}