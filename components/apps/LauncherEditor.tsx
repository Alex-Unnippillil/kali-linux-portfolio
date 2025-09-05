"use client";

import React, { useEffect, useState } from "react";
import apps from "../../apps.config";

const LauncherEditor: React.FC = () => {
    const [name, setName] = useState("");
    const [comment, setComment] = useState("");
    const [icon, setIcon] = useState("");
    const [categories, setCategories] = useState("");

    useEffect(() => {
        const id = (window as any).launcherEditorTarget;
        const app = apps.find(a => a.id === id);
        if (app) {
            setName(app.title || "");
            setComment((app as any).comment || "");
            setIcon(app.icon || "");
            setCategories((app as any).categories || "");
        }
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const id = (window as any).launcherEditorTarget;
        const app = apps.find(a => a.id === id);
        if (app) {
            app.title = name;
            (app as any).comment = comment;
            app.icon = icon;
            (app as any).categories = categories;
            window.dispatchEvent(new CustomEvent("launcher-updated", { detail: { id } }));
        }
    };

    return (
        <form onSubmit={handleSave} className="p-4 space-y-3 text-white bg-ub-cool-grey h-full overflow-auto">
            <label className="block">
                <span className="text-sm">Name</span>
                <input className="w-full p-1 text-black" value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label className="block">
                <span className="text-sm">Comment</span>
                <input className="w-full p-1 text-black" value={comment} onChange={e => setComment(e.target.value)} />
            </label>
            <label className="block">
                <span className="text-sm">Icon</span>
                <input className="w-full p-1 text-black" value={icon} onChange={e => setIcon(e.target.value)} />
            </label>
            <label className="block">
                <span className="text-sm">Categories</span>
                <input className="w-full p-1 text-black" value={categories} onChange={e => setCategories(e.target.value)} />
            </label>
            <button type="submit" className="px-2 py-1 bg-gray-700 hover:bg-gray-600">Save</button>
        </form>
    );
};

export const displayLauncherEditor = () => <LauncherEditor />;

export default LauncherEditor;

