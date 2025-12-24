'use client';

import SceneWebGL from '@/components/Scene';


export default function Home() {

    return (
        <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
            <div className="absolute inset-0 z-0 h-full w-full">
                <SceneWebGL />
            </div>
        </main>
    );
}
