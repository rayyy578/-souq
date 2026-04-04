import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Souq - Marketplace",
  description: "Buy and sell products on Souq",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b bg-white">
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="text-xl font-bold text-emerald-600">
            Souq
          </a>
          <a href="/shop" className="text-sm text-gray-600 hover:text-gray-900">
            Shop
          </a>
          <a href="/search" className="text-sm text-gray-600 hover:text-gray-900">
            Search
          </a>
        </div>

        <div className="flex items-center gap-4">
          <a href="/cart" className="text-sm text-gray-600 hover:text-gray-900">
            Cart
          </a>
          {user ? (
            <>
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Orders
              </a>
              <a href="/seller/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Seller
              </a>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm text-gray-600 hover:text-gray-900 bg-none border-none p-0 cursor-pointer">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
        &copy; {new Date().getFullYear()} Souq. All rights reserved.
      </div>
    </footer>
  );
}
