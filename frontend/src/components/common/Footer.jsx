import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Viwanja", to: "/viwanja", available: true },
      { label: "Mashamba", to: "/mashamba", available: true },
      { label: "Maarifa", to: "/maarifa", available: true },
    ],
  },
  {
    title: "Platform",
    links: [
{ label: "About Plotbase", to: "/about", available: true },
      { label: "How It Works", to: "/how-it-works" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", to: "/contact" },
      { label: "Help Center", to: "/help" },
      { label: "Ask About Plotbase", to: "/ask-plotbase" },
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="w-full border-t border-zinc-200 bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6">

        {/* MAIN FOOTER */}
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">

          {/* BRAND */}
          <div className="max-w-xs">
            <Link
              to="/viwanja"
              className="inline-flex text-xl font-semibold tracking-tight text-zinc-950"
            >
              Plotbase Tanzania
            </Link>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Connecting investors with land opportunities
              across Tanzania.
            </p>

            <p className="mt-3 text-sm font-medium text-zinc-800">
              Tupo Pamoja.
            </p>
          </div>

          {/* FOOTER LINKS */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-4 text-sm font-semibold text-zinc-950">
                {section.title}
              </h2>

              <ul className="space-y-3">
                {section.links.map((item) => (
                  <li key={item.label}>
                    {item.available ? (
                      <Link
                        to={item.to}
                        className="group inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-950"
                      >
                        {item.label}

                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        title="Coming soon"
                        className="inline-flex items-center gap-2 text-sm text-zinc-500"
                      >
                        {item.label}

                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          Soon
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* BOTTOM SECTION */}
        <div className="mt-10 flex flex-col gap-4 border-t border-zinc-200 pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">

          <p>
            © {new Date().getFullYear()} Plotbase Tanzania.
            All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />

            <span>
              Made for Tanzania. Tupo Pamoja.
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;