import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getErrorMessage } from '@/lib/utils';

const KIOSK_PIN = '9999'; // Kiosk PIN - should be configurable in production

export function KioskLoginPage() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (newPin.every(digit => digit !== '') && index === 3) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle Enter
    if (e.key === 'Enter' && pin.every(digit => digit !== '')) {
      handleSubmit(pin.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '').slice(0, 4).split('');

    const newPin = ['', '', '', ''];
    digits.forEach((digit, i) => {
      newPin[i] = digit;
    });
    setPin(newPin);
    setError(null);

    // Focus the last filled input or the first empty one
    const lastFilledIndex = digits.length - 1;
    const nextIndex = Math.min(lastFilledIndex + 1, 3);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (pinValue?: string) => {
    const pinToCheck = pinValue || pin.join('');
    
    if (pinToCheck.length !== 4) {
      setError('Por favor, digite o PIN completo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    if (pinToCheck === KIOSK_PIN) {
      // Navigate to kiosk mode
      navigate('/manage?kiosk=true');
    } else {
      setError('PIN incorreto. Tente novamente.');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setIsSubmitting(false);
  };

  const clearPin = () => {
    setPin(['', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const isPinComplete = pin.every(digit => digit !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="bg-white/98 rounded-3xl p-8 sm:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-4xl text-[#0a0a0a]">tv</span>
            </div>
            <h1 className="font-['Playfair_Display',serif] text-3xl text-[#1a1a1a] mb-2">
              Modo Kiosk
            </h1>
            <p className="text-base text-[#666]">
              Digite o PIN para ativar o display
            </p>
          </div>

          {/* PIN Section */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-[#666] mb-4 text-center uppercase tracking-wider">
              PIN do Kiosk
            </label>
            <div className="flex gap-3 justify-center">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-16 h-20 rounded-xl border-2 text-center text-3xl font-semibold transition-all ${
                    error
                      ? 'border-[#ef4444] bg-[#fee2e2] animate-shake'
                      : 'border-[#e0e0e0] bg-[#f8f8f8] focus:border-[#D4AF37] focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/10'
                  }`}
                  aria-label={`Dígito ${index + 1} do PIN`}
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-[#ef4444] text-center mt-4">{error}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={!isPinComplete || isSubmitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl flex items-center justify-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-h-[52px]"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                Verificando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">play_arrow</span>
                Iniciar Kiosk
              </>
            )}
          </button>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-[#666] hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
