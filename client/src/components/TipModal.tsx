import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createTipIntent } from '../api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

const AMOUNTS = [500, 1000, 2000, 5000];

function formatCents(cents: number) {
  return `$${cents / 100}`;
}

interface CheckoutFormProps {
  eventSlug: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

function CheckoutForm({ eventSlug, amount, onSuccess, onClose }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const { clientSecret } = await createTipIntent(eventSlug, amount);
      const card = elements.getElement(CardElement);
      if (!card) return;
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (result.error) {
        setError(result.error.message ?? 'Payment failed');
      } else {
        onSuccess();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '14px',
          marginBottom: 16,
        }}
      >
        <CardElement
          options={{ style: { base: { color: '#fff', fontSize: '16px', '::placeholder': { color: 'rgba(255,255,255,0.3)' } } } }}
        />
      </div>
      {error && <p style={{ color: '#ff4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: 15,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          style={{
            flex: 2,
            padding: 14,
            borderRadius: 10,
            border: 'none',
            background: '#ff8c00',
            color: '#000',
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {loading ? 'Processing...' : `Tip ${formatCents(amount)}`}
        </button>
      </div>
    </form>
  );
}

interface Props {
  eventSlug: string;
  onClose: () => void;
}

export function TipModal({ eventSlug, onClose }: Props) {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [success, setSuccess] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 28,
          width: '100%',
          maxWidth: 420,
        }}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔥</div>
            <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: 2, margin: '0 0 8px' }}>
              You're a legend!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
              The DJ appreciates you!
            </p>
            <button
              onClick={onClose}
              style={{
                background: '#ff8c00',
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 32px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 28,
                letterSpacing: 2,
                margin: '0 0 20px',
              }}
            >
              Tip the DJ
            </h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 10,
                    border: `1px solid ${selectedAmount === amt ? '#ff8c00' : 'rgba(255,255,255,0.15)'}`,
                    background: selectedAmount === amt ? 'rgba(255,140,0,0.15)' : 'transparent',
                    color: selectedAmount === amt ? '#ff8c00' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {formatCents(amt)}
                </button>
              ))}
            </div>

            <Elements stripe={stripePromise}>
              <CheckoutForm
                eventSlug={eventSlug}
                amount={selectedAmount}
                onSuccess={() => setSuccess(true)}
                onClose={onClose}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}
