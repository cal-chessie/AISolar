import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { brand } from "@/config/brand";

/**
 * 404 — clean, family, no ornament. The old version was the last page on the
 * shiny look (gradient blobs + sun-ray animation), pointed a public page at an
 * app route (/consultant), and used a wrong support email. This one is calm,
 * on-brand, and only links where a lost visitor should actually go.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404: route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center px-5 text-center">
      <div className="max-w-md w-full">
        <div className="mx-auto mb-6 size-11 rounded-[12px] bg-primary grid place-items-center text-primary-foreground text-sm font-semibold">
          AIOS
        </div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">This page has moved on</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-body">
          The link is broken or the page no longer exists. Let's get you back to something useful.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Back to home <ArrowRight className="size-4" />
          </Link>
          <button onClick={() => navigate(-1)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-card px-5 text-sm font-semibold shadow-card hover:bg-muted transition-colors">
            <ArrowLeft className="size-4" /> Go back
          </button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Still stuck?{" "}
          <a href={`mailto:${brand.contact.email}`} className="text-foreground underline underline-offset-2 hover:no-underline">
            {brand.contact.email}
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
