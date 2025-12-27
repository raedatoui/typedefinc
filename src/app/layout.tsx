import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import './globals.css';

const workSans = Work_Sans({
    subsets: ['latin'],
    weight: '600',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Typedef',
    description: 'Typedef Inc',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={workSans.className}>{children}</body>
        </html>
    );
}
