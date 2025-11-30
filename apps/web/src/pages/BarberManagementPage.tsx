import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBarbers } from '@/hooks/useBarbers';
import { useModal } from '@/hooks/useModal';
import { Modal } from '@/components/Modal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { BarberCard } from '@/components/BarberCard';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';

export function BarberManagementPage() {
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const { barbers, isLoading, error, refetch } = useBarbers();
  const addModal = useModal();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  const [barberToDelete, setBarberToDelete] = useState<number | null>(null);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', avatarUrl: '' });

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      await api.createBarber?.(config.slug, {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      });
      setFormData({ name: '', avatarUrl: '' });
      addModal.close();
      await refetch();
    } catch (error) {
      console.error('Error adding barber:', error);
      alert('Erro ao adicionar barbeiro. Tente novamente.');
    }
  };

  const handleEdit = async () => {
    if (!editingBarber || !formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      await api.updateBarber?.(editingBarber.id, {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      });
      setEditingBarber(null);
      setFormData({ name: '', avatarUrl: '' });
      editModal.close();
      await refetch();
    } catch (error) {
      console.error('Error updating barber:', error);
      alert('Erro ao atualizar barbeiro. Tente novamente.');
    }
  };

  const handleDelete = async () => {
    if (!barberToDelete) return;

    try {
      await api.deleteBarber?.(barberToDelete);
      deleteConfirmModal.close();
      setBarberToDelete(null);
      await refetch();
    } catch (error) {
      console.error('Error deleting barber:', error);
      alert('Erro ao remover barbeiro. Tente novamente.');
    }
  };

  const openEditModal = (barber: any) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      avatarUrl: barber.avatarUrl || '',
    });
    editModal.open();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Gerenciar Barbeiros</h1>
              <p className="text-muted-foreground mt-2">
                Adicione, edite ou remova barbeiros
              </p>
            </div>
            <Button onClick={addModal.open} size="lg">
              <span className="material-symbols-outlined">add</span>
              Adicionar Barbeiro
            </Button>
          </div>

          {/* Barbers List */}
          {isLoading ? (
            <LoadingSpinner size="lg" text="Carregando barbeiros..." />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={refetch} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {barbers.map((barber) => (
                <div key={barber.id} className="relative group">
                  <BarberCard barber={barber} showPresence />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => openEditModal(barber)}
                      className="p-1 rounded bg-background/80 hover:bg-background"
                      aria-label="Edit barber"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setBarberToDelete(barber.id);
                        deleteConfirmModal.open();
                      }}
                      className="p-1 rounded bg-destructive/80 hover:bg-destructive"
                      aria-label="Delete barber"
                    >
                      <span className="material-symbols-outlined text-sm text-white">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Barber Modal */}
      <Modal
        isOpen={addModal.isOpen}
        onClose={() => {
          addModal.close();
          setFormData({ name: '', avatarUrl: '' });
        }}
        title="Adicionar Barbeiro"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="addName" className="block text-sm font-medium mb-2">
              Nome *
            </label>
            <input
              id="addName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="addAvatar" className="block text-sm font-medium mb-2">
              URL do Avatar (opcional)
            </label>
            <input
              id="addAvatar"
              type="url"
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={addModal.close} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Barber Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close();
          setEditingBarber(null);
          setFormData({ name: '', avatarUrl: '' });
        }}
        title="Editar Barbeiro"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="editName" className="block text-sm font-medium mb-2">
              Nome *
            </label>
            <input
              id="editName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="editAvatar" className="block text-sm font-medium mb-2">
              URL do Avatar (opcional)
            </label>
            <input
              id="editAvatar"
              type="url"
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={editModal.close} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirmModal.isOpen}
        onClose={deleteConfirmModal.close}
        onConfirm={handleDelete}
        title="Remover Barbeiro"
        message="Tem certeza que deseja remover este barbeiro? Todos os clientes atribuídos a ele serão desatribuídos."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
      />
    </div>
  );
}
