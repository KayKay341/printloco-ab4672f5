import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Status =
  | "validating"
  | "ready"
  | "already"
  | "invalid"
  | "submitting"
  | "done"
  | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(json?.error ?? "Invalid or expired link");
          return;
        }
        if (json.valid === false && json.reason === "already_unsubscribed") {
          setStatus("already");
          return;
        }
        setStatus("ready");
      } catch {
        setStatus("invalid");
        setErrorMsg("Could not validate this link");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
          },
          body: JSON.stringify({ token }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (json.success || json.reason === "already_unsubscribed") {
        setStatus("done");
      } else {
        setStatus("error");
        setErrorMsg(json?.error ?? "Could not unsubscribe");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 shadow-card">
        <h1 className="font-display text-3xl text-foreground mb-3">
          Email preferences
        </h1>

        {status === "validating" && (
          <p className="text-muted-foreground">Checking your link…</p>
        )}

        {status === "ready" && (
          <>
            <p className="text-muted-foreground mb-6">
              Click below to unsubscribe from PrintLoco emails. You'll stop
              receiving updates immediately.
            </p>
            <Button onClick={confirm} className="w-full" size="lg">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {status === "submitting" && (
          <p className="text-muted-foreground">Processing…</p>
        )}

        {status === "done" && (
          <>
            <p className="text-foreground mb-2 font-medium">
              You've been unsubscribed.
            </p>
            <p className="text-muted-foreground mb-6">
              We won't email you again. Changed your mind? Just rejoin the
              waitlist anytime.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Back to PrintLoco</Link>
            </Button>
          </>
        )}

        {status === "already" && (
          <>
            <p className="text-foreground mb-6">
              This email is already unsubscribed.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Back to PrintLoco</Link>
            </Button>
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <p className="text-foreground mb-2 font-medium">
              We couldn't process that link.
            </p>
            <p className="text-muted-foreground mb-6">
              {errorMsg ?? "The link may have expired or already been used."}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Back to PrintLoco</Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
