import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Sprout,
  MapPinned,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import { Button } from "../../components/ui/button";

const Mashamba = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 pb-16 pt-28 sm:px-6">
        <div className="w-full max-w-2xl text-center">

          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/50">
            <Sprout className="h-8 w-8" strokeWidth={1.5} />
          </div>

          {/* Coming Soon Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Coming Soon
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Mashamba
          </h1>

          <p className="mt-3 text-lg font-medium text-foreground">
            Discover Agricultural Land Opportunities
          </p>

          {/* Description */}
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
            We're preparing a dedicated space where investors
            can explore agricultural land and farming investment
            opportunities across Tanzania.
          </p>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
            Mashamba is coming soon. In the meantime, you can
            continue exploring available land projects on Plotbase.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

            <Button
              onClick={() => navigate("/viwanja")}
              className="h-11 gap-2 px-6"
            >
              Explore Viwanja
              <ArrowRight className="h-4 w-4" />
            </Button>

          </div>

          {/* Brand Message */}
          <div className="mt-12 border-t border-border pt-6">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <MapPinned className="h-4 w-4" />

              <span>
                Plotbase Tanzania — Tupo Pamoja.
              </span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Mashamba;