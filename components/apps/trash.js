import React, { Component } from 'react';
import Image from 'next/image';

export class Trash extends Component {
    constructor() {
        super();
        const now = new Date().toLocaleString();
        this.trashItems = [
            {
                name: "php",
                icon: "/themes/filetypes/php.png",
                path: "/var/www/php",
                deletedAt: now,
            },
            {
                name: "Angular.js",
                icon: "/themes/filetypes/js.png",
                path: "/home/user/angular.js",
                deletedAt: now,
            },
            {
                name: "node_modules",
                icon: "/themes/Yaru/system/folder.png",
                path: "/home/user/node_modules",
                deletedAt: now,
            },
            {
                name: "abandoned project",
                icon: "/themes/Yaru/system/folder.png",
                path: "/home/user/projects/abandoned",
                deletedAt: now,
            },
            {
                name: "INFR 4900U blockchain assignment AlexUnnippillil.zip",
                icon: "/themes/filetypes/zip.png",
                path: "/home/user/INFR-4900U.zip",
                deletedAt: now,
            },
            {
                name: "cryptography project final",
                icon: "/themes/Yaru/system/folder.png",
                path: "/home/user/crypto-final",
                deletedAt: now,
            },
            {
                name: "project machine learning-final",
                icon: "/themes/Yaru/system/folder.png",
                path: "/home/user/ml-final",
                deletedAt: now,
            },
        ];
        this.state = {
            empty: false,
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            selectedItems: [],
            lastSelected: null,
            confirmEmpty: false,
            recentlyDeleted: [],
            showUndo: false,
        };
        this.undoTimer = null;
    }

    componentDidMount() {
        // get user preference from local-storage
        let wasEmpty = localStorage.getItem("trash-empty");
        if (wasEmpty !== null && wasEmpty !== undefined) {
            if (wasEmpty === "true") this.setState({ empty: true });
        }
    }

    componentWillUnmount() {
        if (this.undoTimer) clearTimeout(this.undoTimer);
    }

    selectItem = (index, e) => {
        const { selectedItems, lastSelected } = this.state;
        let newSelection = [];
        if (e.shiftKey && lastSelected !== null) {
            const [start, end] = [Math.min(index, lastSelected), Math.max(index, lastSelected)];
            for (let i = start; i <= end; i++) newSelection.push(i);
        } else if (e.ctrlKey || e.metaKey) {
            if (selectedItems.includes(index)) newSelection = selectedItems.filter(i => i !== index);
            else newSelection = [...selectedItems, index];
        } else {
            newSelection = [index];
        }
        this.setState({ selectedItems: newSelection, lastSelected: index });
    };

    openEmptyConfirm = () => {
        this.setState({ confirmEmpty: true });
    };

    performEmptyTrash = () => {
        const deleted = [...this.trashItems];
        this.trashItems = [];
        this.setState({
            empty: true,
            confirmEmpty: false,
            recentlyDeleted: deleted,
            showUndo: true,
            selectedItems: [],
        });
        localStorage.setItem("trash-empty", true);
        if (this.undoTimer) clearTimeout(this.undoTimer);
        this.undoTimer = setTimeout(() => {
            this.setState({ recentlyDeleted: [], showUndo: false });
        }, 10000);
    };

    cancelEmpty = () => {
        this.setState({ confirmEmpty: false });
    };

    undoDelete = () => {
        const { recentlyDeleted } = this.state;
        if (this.undoTimer) clearTimeout(this.undoTimer);
        this.trashItems = [...this.trashItems, ...recentlyDeleted];
        this.setState({
            empty: this.trashItems.length === 0,
            recentlyDeleted: [],
            showUndo: false,
        });
        localStorage.setItem("trash-empty", this.trashItems.length === 0);
    };

    emptyScreen = () => {
        return (
            <div className="flex-grow flex flex-col justify-center items-center">
                <Image
                    className=" w-24"
                    src="/themes/Yaru/status/user-trash-symbolic.svg"
                    alt="Ubuntu Trash"
                    width={96}
                    height={96}
                    sizes="96px"
                />
                <span className="font-bold mt-4 text-xl px-1 text-gray-400">Trash is Empty</span>
            </div>
        );
    }

    showTrashItems = () => {
        return (
            <div className="flex-grow ml-4 flex flex-wrap items-start content-start justify-start overflow-y-auto windowMainScreen">
                {
                    this.trashItems.map((item, index) => {
                        const selected = this.state.selectedItems.includes(index);
                        return (
                            <div
                                key={index}
                                tabIndex="1"
                                onClick={(e) => this.selectItem(index, e)}
                                className={`flex flex-col items-center text-sm outline-none w-32 my-2 mx-4 cursor-pointer ${selected ? '' : ''}`}
                            >
                                <div className={`w-16 h-16 flex items-center justify-center ${selected ? 'opacity-60' : ''}`}>
                                    <Image
                                        src={item.icon}
                                        alt="Ubuntu File Icons"
                                        width={48}
                                        height={48}
                                        sizes="48px"
                                    />
                                </div>
                                <span className={`text-center rounded px-0.5 ${selected ? 'bg-ub-orange' : ''}`}>{item.name}</span>
                                <span className="text-center text-xs text-gray-400 break-all px-0.5">{item.path}</span>
                                <span className="text-center text-xs text-gray-400 px-0.5">{item.deletedAt}</span>
                            </div>
                        );
                    })
                }
            </div>
        );
    };

    selectFile = async () => {
        if (!window.showOpenFilePicker) {
            alert('File System Access API not supported');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker();
            const permission = await handle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') return;
            const file = await handle.getFile();
            let preview;
            if (file.type.startsWith('image/')) {
                preview = { type: 'image', url: URL.createObjectURL(file) };
            } else {
                const text = await file.text();
                preview = { type: 'text', text: text.slice(0, 100) };
            }
            this.setState({ fileHandle: handle, filePreview: preview, confirmDelete: true });
        } catch (err) {
            console.error(err);
        }
    }

    deleteSelected = async () => {
        const { fileHandle, filePreview } = this.state;
        if (!fileHandle) return;
        try {
            if (fileHandle.remove) {
                await fileHandle.remove();
            }
        } catch (err) {
            console.error(err);
        }
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        this.setState({ fileHandle: null, filePreview: null, confirmDelete: false });
    }

    cancelDelete = () => {
        const { filePreview } = this.state;
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        this.setState({ fileHandle: null, filePreview: null, confirmDelete: false });
    }

    render() {
        return (
            <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none relative">
                <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
                    <span className="font-bold ml-2">Trash</span>
                    <div className="flex">
                        <div className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded text-gray-300">Restore</div>
                        <div onClick={this.openEmptyConfirm} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80">Empty Trash</div>
                        <div onClick={this.selectFile} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80">Delete File</div>
                    </div>
                </div>
                {this.state.empty ? this.emptyScreen() : this.showTrashItems()}
                {this.state.confirmDelete && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full">
                            <p className="mb-2">Delete {this.state.fileHandle?.name}?</p>
                            {this.state.filePreview?.type === 'image' ? (
                                <img src={this.state.filePreview.url} alt="Preview" className="max-w-xs max-h-64 mb-2" />
                            ) : (
                                <pre className="whitespace-pre-wrap max-w-xs max-h-64 overflow-auto mb-2">{this.state.filePreview?.text}</pre>
                            )}
                            <div className="flex justify-end space-x-2">
                                <button onClick={this.deleteSelected} className="px-3 py-1 bg-red-600 rounded">Delete</button>
                                <button onClick={this.cancelDelete} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {this.state.confirmEmpty && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full">
                            <p className="mb-4">Empty trash?</p>
                            <div className="flex justify-end space-x-2">
                                <button onClick={this.performEmptyTrash} className="px-3 py-1 bg-red-600 rounded">Empty</button>
                                <button onClick={this.cancelEmpty} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {this.state.showUndo && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-ub-warm-grey px-4 py-2 rounded shadow">
                        <span className="mr-2">Items deleted</span>
                        <button onClick={this.undoDelete} className="underline">Undo</button>
                    </div>
                )}
            </div>
        );
    }
}

export default Trash;

export const displayTrash = () => {
    return <Trash> </Trash>;
}
