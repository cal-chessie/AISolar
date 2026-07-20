import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Bitcoin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaymentMethodSelectorProps {
  onSelectCard: () => void;
  onSelectCrypto: () => void;
  isLoadingCard?: boolean;
  isLoadingCrypto?: boolean;
  amount: number;
  currency?: string;
}

export default function PaymentMethodSelector({
  onSelectCard,
  onSelectCrypto,
  isLoadingCard,
  isLoadingCrypto,
  amount,
  currency = 'EUR'
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'crypto' | null>(null);

  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
    { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
    { symbol: 'USDC', name: 'USD Coin', color: '#2775CA' },
    { symbol: 'USDT', name: 'Tether', color: '#26A17B' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center mb-4">
        Select your preferred payment method
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card Payment Option */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSelectedMethod('card');
            onSelectCard();
          }}
          disabled={isLoadingCard || isLoadingCrypto}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            selectedMethod === 'card' 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50",
            (isLoadingCard || isLoadingCrypto) && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              {isLoadingCard ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">Card Payment</p>
              <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <img src="https://js.stripe.com/v3/fingerprinted/img/visa-365725566f9578a9589553aa9296d178.svg" alt="Visa" className="h-6" />
            <img src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg" alt="Mastercard" className="h-6" />
            <img src="https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46c5cd6a96a6e418a6ca1717c.svg" alt="Amex" className="h-6" />
          </div>
        </motion.button>

        {/* Crypto Payment Option */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSelectedMethod('crypto');
            onSelectCrypto();
          }}
          disabled={isLoadingCard || isLoadingCrypto}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            selectedMethod === 'crypto' 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50",
            (isLoadingCard || isLoadingCrypto) && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              {isLoadingCrypto ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Bitcoin className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">Cryptocurrency</p>
              <p className="text-xs text-muted-foreground">BTC, ETH, USDC, USDT</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {cryptoOptions.map((crypto) => (
              <div
                key={crypto.symbol}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: crypto.color }}
              >
                {crypto.symbol.charAt(0)}
              </div>
            ))}
          </div>
        </motion.button>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Amount: <span className="font-semibold">{currency === 'EUR' ? '€' : '$'}{amount.toLocaleString()}</span>
      </p>
    </div>
  );
}
