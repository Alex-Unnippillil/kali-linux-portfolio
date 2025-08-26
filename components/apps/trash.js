import React, { Component } from 'react';
import Image from 'next/image';

export class Trash extends Component {
    constructor() {
        super();
        this.trashItems = [
            {
                name: "php",
                icon: "/themes/filetypes/php.png"
            },
            {
                name: "Angular.js",
                icon: "/themes/filetypes/js.png"
            },
            {
                name: "node_modules",
                icon: "/themes/Yaru/system/folder.png"
            },

            {
                name: "abandoned project",
                icon: "/themes/Yaru/system/folder.png"
            },
            {
                name: "INFR 4900U blockchain assignment AlexUnnippillil.zip",
                icon: "/themes/filetypes/zip.png"
            },
            {
                name: "cryptography project final",
                icon: "/themes/Yaru/system/folder.png"
            },
            {
                name: "project machine learning-final",
                icon: "/themes/Yaru/system/folder.png"
            },

        ];
        this.state = {
            empty: false,
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            showEmptyModal: false,
            emptyConfirm: '',
            undoAvailable: false,
        }
    }

    componentDidMount() {
        // get user preference from local-storage
        let wasEmpty = localStorage.getItem("trash-empty");
        if (wasEmpty !== null && wasEmpty !== undefined) {
            if (wasEmpty === "true") this.setState({ empty: true });
        }
    }

    focusFile = (e) => {
        // icon
        const children = e.currentTarget.children;
        if (children[0]) children[0].classList.toggle("opacity-60");
        // file name
        if (children[1]) children[1].classList.toggle("bg-ub-orange");
    }

    emptyTrash = () => {
        this.setState({ empty: true, undoAvailable: true });
        localStorage.setItem("trash-empty", true);
    };

    undoEmpty = () => {
        this.setState({ empty: false, undoAvailable: false });
        localStorage.setItem("trash-empty", false);
    };

    openEmptyModal = () => {
        this.setState({ showEmptyModal: true, emptyConfirm: '' });
    };

    closeEmptyModal = () => {
        this.setState({ showEmptyModal: false, emptyConfirm: '' });
    };

    handleEmptyConfirm = (e) => {
        this.setState({ emptyConfirm: e.target.value });
    };

    confirmEmptyTrash = () => {
        if (this.state.emptyConfirm === 'EMPTY') {
            this.emptyTrash();
            this.setState({ showEmptyModal: false, emptyConfirm: '' });
        }
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
                        return (
                            <div key={index} tabIndex="1" onFocus={this.focusFile} onBlur={this.focusFile} className="flex flex-col items-center text-sm outline-none w-16 my-2 mx-4">
                                <div className="w-16 h-16 flex items-center justify-center">
                                    <Image
                                        src={item.icon}
                                        alt="Ubuntu File Icons"
                                        width={48}
                                        height={48}
                                        sizes="48px"
                                    />
                                </div>
                                <span className="text-center rounded px-0.5">{item.name}</span>
                            </div>
                        )
                    })
                }
            </div>
        );
    }

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
                        <div onClick={this.openEmptyModal} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80">Empty</div>
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
                {this.state.showEmptyModal && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full">
                            <p className="mb-2">Type &apos;EMPTY&apos; to permanently delete all items.</p>
                            <input
                                value={this.state.emptyConfirm}
                                onChange={this.handleEmptyConfirm}
                                className="w-full mb-2 text-black px-2 py-1 rounded"
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={this.confirmEmptyTrash}
                                    disabled={this.state.emptyConfirm !== 'EMPTY'}
                                    className="px-3 py-1 bg-red-600 rounded disabled:opacity-50"
                                >
                                    Empty
                                </button>
                                <button onClick={this.closeEmptyModal} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {this.state.undoAvailable && this.state.empty && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-ub-warm-grey bg-opacity-90 text-sm px-4 py-2 rounded">
                        Trash emptied.
                        <button onClick={this.undoEmpty} className="underline ml-2">Undo</button>
                    </div>
                )}
            </div>
        )
    }
}

export default Trash;

export const displayTrash = () => {
    return <Trash> </Trash>;
}
