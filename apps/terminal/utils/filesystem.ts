
export interface FileEntry {
    name: string;
    kind: 'file' | 'directory';
}

export class VirtualFileSystem {
    private root: FileSystemDirectoryHandle | null = null;

    constructor(root: FileSystemDirectoryHandle | null) {
        this.root = root;
    }

    setRoot(root: FileSystemDirectoryHandle | null) {
        this.root = root;
    }

    // Resolve simplified path (no . or .. support for simplification to keep it robust enough for demo)
    // Actually we need basic .. support for 'cd ..'
    resolvePath(cwd: string, target: string): string {
        if (!target) return cwd;

        // Handle home tilde
        if (target === '~') return '/home';
        if (target.startsWith('~/')) return '/home' + target.slice(1);

        // Absolute
        let path = target.startsWith('/') ? target : `${cwd === '/' ? '' : cwd}/${target}`;

        // Normalize
        const parts = path.split('/').filter(Boolean);
        const stack: string[] = [];

        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                stack.pop();
            } else {
                stack.push(part);
            }
        }

        return '/' + stack.join('/');
    }

    async getHandle(
        path: string,
        create: 'file' | 'directory' | false = false
    ): Promise<FileSystemHandle | null> {
        if (!this.root) return null;

        const parts = path.split('/').filter(Boolean);
        let current: FileSystemDirectoryHandle = this.root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            try {
                if (isLast && create === 'file') {
                    return await current.getFileHandle(part, { create: true });
                }

                // If we are looking for a file at this stage (not last), it's an error unless strictly directory traversal
                // If creating directory
                if (isLast && create === 'directory') {
                    return await current.getDirectoryHandle(part, { create: true });
                }

                // Just traversing
                current = await current.getDirectoryHandle(part, { create: false });

                if (isLast && !create) return current;

            } catch (e) {
                // handle not found or type mismatch
                // If we are creating, we might need to create intermediate directories? 
                // For now assume mkdir -p logic or standard mkdir? 
                // Standard mkdir usually fails if parent doesn't exist.
                // Let's assume standard behavior: fail if parent missing.
                // BUT for 'cd', 'ls' etc we just return null on failure
                if (isLast && create === 'file') {
                    // Maybe parent doesn't exist? current is parent.
                    // If getFileHandle failed, it might be typemismatch or access denied
                }
                return null;
            }
        }

        // If path is root '/'
        if (parts.length === 0) return this.root;

        return current;
    }

    async readDirectory(path: string): Promise<FileEntry[] | null> {
        const handle = await this.getHandle(path);
        if (!handle || handle.kind !== 'directory') return null;

        const dirHandle = handle as FileSystemDirectoryHandle;
        const entries: FileEntry[] = [];

        try {
            // @ts-ignore - TS definitions for OPFS iteration might be missing/old
            for await (const [name, entry] of dirHandle.entries()) {
                entries.push({ name, kind: entry.kind });
            }
        } catch (e) {
            console.error('Error reading directory', e);
            return [];
        }
        return entries.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
        });
    }

    async readFile(path: string): Promise<string | null> {
        const handle = await this.getHandle(path);
        if (!handle || handle.kind !== 'file') return null;

        try {
            const file = await (handle as FileSystemFileHandle).getFile();
            return await file.text();
        } catch {
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        // We need to resolve parent dir first to be safe, but getHandle with create='file' works if parent exists
        // But getHandle logic above assumes traversing directories. 
        // Let's rely on getHandle to find the file or create it if parent exists.

        try {
            // Need to split to get parent
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const fileName = path.split('/').pop()!;

            const parentHandle = await this.getHandle(parentPath);
            if (!parentHandle || parentHandle.kind !== 'directory') return false;

            const dirHandle = parentHandle as FileSystemDirectoryHandle;
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (e) {
            console.error('Write failed', e);
            return false;
        }
    }

    async createDirectory(path: string): Promise<boolean> {
        try {
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const dirName = path.split('/').pop()!;

            const parentHandle = await this.getHandle(parentPath);
            if (!parentHandle || parentHandle.kind !== 'directory') return false;

            await (parentHandle as FileSystemDirectoryHandle).getDirectoryHandle(dirName, { create: true });
            return true;
        } catch {
            return false;
        }
    }

    async deleteEntry(path: string): Promise<boolean> {
        try {
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const name = path.split('/').pop()!;

            const parentHandle = await this.getHandle(parentPath);
            if (!parentHandle || parentHandle.kind !== 'directory') return false;

            await (parentHandle as FileSystemDirectoryHandle).removeEntry(name);
            return true;
        } catch {
            return false;
        }
    }

    async exists(path: string): Promise<boolean> {
        const handle = await this.getHandle(path);
        return !!handle;
    }
}
