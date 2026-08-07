import Link from "next/link";

const tabs = [
  { href: "/settings/categories", label: "Categories" },
  { href: "/settings/templates",  label: "Templates" },
  { href: "/settings/statuses",   label: "Statuses & Tags" },
  { href: "/settings/scoring",    label: "Scoring Rules" },
  { href: "/settings/app",        label: "App Settings" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Settings</h1>
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 -mb-px transition-colors"
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
