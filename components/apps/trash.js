import React, { Component, createRef } from 'react';
import Image from 'next/image';

const INITIAL_ITEMS = [
    { name: 'php', icon: '/themes/filetypes/php.png' },
    { name: 'Angular.js', icon: '/themes/filetypes/js.png' },
    { name: 'node_modules', icon: '/themes/Yaru/system/folder.png' },
    { name: 'abandoned project', icon: '/themes/Yaru/system/folder.png' },
    { name: 'INFR 4900U blockchain assignment AlexUnnippillil.zip', icon: '/themes/filetypes/zip.png' },
    { name: 'cryptography project final', icon: '/themes/Yaru/system/folder.png' },
    { name: 'project machine learning-final', icon: '/themes/Yaru/system/folder.png' },
];

export class Trash extends Component {
    constructor() {
        super();
        this.state = {
            items: [...INITIAL_ITEMS],
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            toast: null,
            showEmptyModal: false,
        };

        this.toastTimeout = null;
        this.confirmRef = createRef();
        this.cancelRef = createRef();
        this.lastEmptied = [];
    }

    componentDidMount() {
        const wasEmpty = localStorage.getItem('trash-empty');
        if (wasEmpty === 'true') {
            this.setState({ items: [] });
        }
    }

    focusFile = (e) => {
        // icon
        const children = e.currentTarget.children;
        if (children[0]) children[0].classList.toggle("opacity-60");
        // file name
        if (children[1]) children[1].classList.toggle("bg-ub-orange");
    }

    animateFall = (el, cb) => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            cb && cb();
            return;
        }
        const rect = el.getBoundingClientRect();
        const distance = window.innerHeight - rect.top - rect.height;
        const duration = 500;
        let start;
        const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            el.style.transform = `translateY(${progress * distance}px)`;
            if (progress < 1) requestAnimationFrame(step);
            else cb && cb();
        };
        requestAnimationFrame(step);
    };

    showUndoToast = (undoAction, message = 'Items deleted') => {
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.setState({ toast: { message, undoAction } });
        this.toastTimeout = setTimeout(() => {
            this.setState({ toast: null });
        }, 6000);
    };

    undo = () => {
        if (this.state.toast?.undoAction) this.state.toast.undoAction();
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.setState({ toast: null });
    };

    openEmptyModal = () => {
        if (this.state.items.length === 0) return;
        this.setState({ showEmptyModal: true }, () => {
            this.confirmRef.current?.focus();
        });
    };

    handleModalKeyDown = (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === this.confirmRef.current) {
                    e.preventDefault();
                    this.cancelRef.current?.focus();
                }
            } else {
                if (document.activeElement === this.cancelRef.current) {
                    e.preventDefault();
                    this.confirmRef.current?.focus();
                }
            }
        } else if (e.key === 'Enter') {
            this.confirmEmpty();
        } else if (e.key === 'Escape') {
            this.cancelEmpty();
        }
    };

    confirmEmpty = () => {
        const items = [...this.state.items];
        const els = document.querySelectorAll('.trash-item');
        let finished = 0;
        const done = () => {
            finished++;
            if (finished === els.length) {
                this.setState({ items: [], showEmptyModal: false }, () => {
                    localStorage.setItem('trash-empty', true);
                    this.lastEmptied = items;
                    this.showUndoToast(() => {
                        this.setState({ items: this.lastEmptied });
                        localStorage.setItem('trash-empty', false);
                    }, 'Trash emptied');
                });
            }
        };
        if (els.length === 0) {
            this.setState({ items: [], showEmptyModal: false });
            localStorage.setItem('trash-empty', true);
            return;
        }
        els.forEach((el) => this.animateFall(el, done));
    };

    cancelEmpty = () => {
        this.setState({ showEmptyModal: false });
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
                {this.state.items.map((item, index) => (
                    <div
                        key={index}
                        tabIndex="1"
                        onFocus={this.focusFile}
                        onBlur={this.focusFile}
                        className="trash-item flex flex-col items-center text-sm outline-none w-16 my-2 mx-4"
                    >
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
                ))}
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

    deleteSelected = () => {
        const { fileHandle, filePreview, items } = this.state;
        if (!fileHandle) return;
        const newItem = { name: fileHandle.name, icon: '/themes/Yaru/system/folder.png', handle: fileHandle };
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        this.setState(
            {
                items: [...items, newItem],
                fileHandle: null,
                filePreview: null,
                confirmDelete: false,
            },
            () => {
                localStorage.setItem('trash-empty', 'false');
                this.showUndoToast(() => {
                    this.setState((prev) => {
                        const updated = prev.items.filter((i) => i !== newItem);
                        localStorage.setItem('trash-empty', updated.length === 0 ? 'true' : 'false');
                        return { items: updated };
                    });
                }, `${fileHandle.name} moved to Trash`);
            }
        );
    };

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
                {this.state.items.length === 0 ? this.emptyScreen() : this.showTrashItems()}
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
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4">
                        <div
                            className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full"
                            tabIndex="-1"
                            onKeyDown={this.handleModalKeyDown}
                        >
                            <p className="mb-4">Empty Trash ({this.state.items.length} items)?</p>
                            <div className="flex justify-end space-x-2">
                                <button ref={this.confirmRef} onClick={this.confirmEmpty} className="px-3 py-1 bg-red-600 rounded">Empty</button>
                                <button ref={this.cancelRef} onClick={this.cancelEmpty} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {this.state.toast && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-md flex items-center"
                    >
                        <span>{this.state.toast.message}</span>
                        {this.state.toast.undoAction && (
                            <button onClick={this.undo} className="ml-4 underline focus:outline-none">Undo</button>
                        )}
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
