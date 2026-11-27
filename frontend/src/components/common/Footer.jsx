import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const footerSections = [
  {
    title: "Products",
    links: [
      { label: "Ramani", to: "/#tools" },
      { label: "FikaSite", to: "/#tools" },
      { label: "Maarifa", to: "/maarifa" },
      { label: "Plotbase REMS", to: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", to: "/about" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", to: "/contact" },
    ],
  },
];

const Footer = () => {
  const handleNavigation = (to) => {
    if (to === "/#tools") {
      // Allow the homepage to render before scrolling.
      setTimeout(() => {
        document.getElementById("tools")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);

      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  };

  return (
    <footer className="w-full border-t border-zinc-200 bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 pb-5 pt-8 sm:px-6">

        {/* MAIN FOOTER */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">

          {/* BRAND */}
          <div className="col-span-2 max-w-xs md:col-span-1">
            <Link
              to="/"
              onClick={() => handleNavigation("/")}
              className="inline-flex text-xl font-semibold tracking-tight text-zinc-950"
            >
              Plotbase Tanzania
            </Link>

            <div className="mt-3 space-y-1 text-sm leading-6 text-zinc-500">
              <p>
                Digital tools for smarter real estate.
              </p>

              <p>
                Empowering real estate through technology.
              </p>
            </div>

            <p className="mt-3 text-sm font-medium text-zinc-900">
              Tupo Pamoja.
            </p>
          </div>

          {/* FOOTER NAVIGATION */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-950">
                {section.title}
              </h2>

              <ul className="space-y-2.5">
                {section.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={() => handleNavigation(item.to)}
                      className="group inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-950"
                    >
                      {item.label}

                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* BOTTOM SECTION */}
        <div className="mt-8 flex flex-col gap-4 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">

          {/* COPYRIGHT */}
          <p className="text-xs leading-5 text-zinc-500">
            © {new Date().getFullYear()} Plotbase Technologies Co. Ltd.
            {" "}All rights reserved.
          </p>

          {/* SOCIAL MEDIA */}
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/plotbase_tanzania/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Plotbase Tanzania on Instagram"
              title="Instagram"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            >
              <svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <rect x="2" y="2" width="20" height="20" rx="5" />
  <circle cx="12" cy="12" r="4" />
  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
</svg>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;