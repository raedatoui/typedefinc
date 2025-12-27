'use client';

import { useEffect, useState } from 'react';
import SceneWebGL from '@/components/Scene';

function isWebGLSupported() {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (e) {
        return false;
    }
}

export default function Home() {
    const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

    useEffect(() => {
        setWebglSupported(isWebGLSupported());
    }, []);

    return (
        <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
            <div className="absolute inset-0 z-0 h-full w-full flex items-center justify-center">
                {webglSupported === false ? (
                    <img
                        src="/10.png"
                        alt="typedef"
                        className="h-full w-[80%] object-contain"
                    />
                ) : webglSupported === true ? (
                    <SceneWebGL />
                ) : null}
            </div>
            <nav className="absolute left-4 top-4 z-10 sm:left-8 sm:top-8">
                <ul className="flex flex-col gap-4 text-lg sm:gap-6 sm:text-xl ">
                    <li className="bg-black/75 p-2">
                        <a href="https://raedatoui.com" target="_blank" rel="noreferrer" className="text-white/70 hover:text-white transition-colors">
                            Raed Atoui
                        </a>
                    </li>
                    <li className="bg-black/75 p-2">
                        <a href="https://listentomina.com" target="_blank" rel="noreferrer" className="text-white/70 hover:text-white transition-colors">
                            Mina Pajević
                        </a>
                    </li>
                    <li className="bg-black/75 p-2">
                        <a href="https://sickleandtorch.com" target="_blank" rel="noreferrer" className="text-white/70 hover:text-white transition-colors">
                            Mihailo Tešić
                        </a>
                    </li>
                </ul>
            </nav>
        </main>
    );
}
