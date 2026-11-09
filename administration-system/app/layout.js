import "./globals.css";

export const metadata = {
  title: "Salon SaaS - Admin Control",
  description: "Mfumo wa Usimamizi wa Mifumo ya Saloon",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sw">
      <body className="bg-sand-100 text-ink-900 font-body">{children}</body>
    </html>
  );
}
