import { Link } from 'react-router-dom';
import { useJoinForm } from './hooks/useJoinForm';

export function JoinForm() {
  const {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    validationError,
    isSubmitting,
    submitError,
    isAlreadyInQueue,
    existingTicketId,
    nameCollisionError,
    handleSubmit,
    navigate,
  } = useJoinForm();

  return (
    <div className="form-card bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl lg:rounded-2xl p-6 sm:p-8 lg:p-10 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          {/* First Name */}
          <div className="input-group flex-1">
            <label
              htmlFor="firstName"
              className="input-label block text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wide mb-2"
            >
              Nome *
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Primeiro nome"
              autoComplete="given-name"
              required
              className={`input-field w-full px-4 py-3.5 rounded-lg bg-[#2a2a2a] border transition-all text-white placeholder:text-[rgba(255,255,255,0.5)] min-h-[52px]
                focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]
                ${validationError ? 'border-[#ef4444] focus:ring-[#ef4444]' : 'border-[rgba(255,255,255,0.2)]'}
              `}
            />
            {validationError && (
              <p className="error-message mt-2 text-sm text-[#ef4444] flex items-center gap-1">
                <span className="material-symbols-outlined text-base">error</span>
                {validationError}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="input-group sm:w-48">
            <label
              htmlFor="lastName"
              className="input-label block text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wide mb-2"
            >
              Sobrenome
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Opcional"
              autoComplete="family-name"
              className="input-field w-full px-4 py-3.5 rounded-lg bg-[#2a2a2a] border border-[rgba(255,255,255,0.2)] transition-all text-white placeholder:text-[rgba(255,255,255,0.5)] min-h-[52px]
                focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]
              "
            />
          </div>
        </div>

        {nameCollisionError && (
          <div className="p-4 rounded-lg bg-[#ef4444]/20 border-2 border-[#ef4444] flex items-start gap-3 animate-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-[#ef4444] text-xl flex-shrink-0 mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#ef4444] mb-1">Nome já está em uso</p>
              <p className="text-sm text-[#ef4444]/90">{nameCollisionError}</p>
            </div>
          </div>
        )}

        {/* Already in Queue Message */}
        {isAlreadyInQueue && existingTicketId && (
          <div className="p-5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl">info</span>
              <div className="flex-1 space-y-3">
                <p className="text-sm font-semibold text-[#D4AF37]">
                  Ticket ativo encontrado
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/status/${existingTicketId}`)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all min-h-[52px]"
                >
                  Ver status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
            <p className="text-sm text-[#ef4444] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {submitError}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn w-full px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg flex items-center justify-center gap-3 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
          disabled={isSubmitting || !!validationError || isAlreadyInQueue || !!nameCollisionError}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
              Entrando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">check</span>
              Confirmar entrada
            </>
          )}
        </button>
      </form>
    </div>
  );
}
