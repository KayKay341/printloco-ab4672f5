const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-accent/15 border-b border-accent/30 px-4 py-2 text-center text-xs font-medium text-accent-foreground">
      Test mode — use card <span className="font-mono">4242 4242 4242 4242</span> · any future date · any CVC.
    </div>
  );
}
