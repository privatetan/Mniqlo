import React from 'react';

interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
    return (
        <header className="sticky top-0 z-50 bg-white px-4 py-3 pb-0 ">
            <h1 className="text-xl font-bold ">{title}</h1>
        </header>
    );
}
