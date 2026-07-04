import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pet Sprite Loop Viewer',
  description: 'Infinite diagonal scrolling pet sprite animations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="m-0 p-0 overflow-hidden select-none bg-[#ffffff]">{children}</body>
    </html>
  );
}
