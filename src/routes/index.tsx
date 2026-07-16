import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getAuth } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const { token, base } = getAuth();
    navigate({ to: token && base ? "/today" : "/login", replace: true });
  }, [navigate]);
  return <div className="min-h-screen bg-background" />;
}
