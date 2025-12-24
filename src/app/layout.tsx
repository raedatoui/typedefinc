import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Sickle & Torch',
    description: 'Three.js Scaffold',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
