import React, { Component, createRef } from 'react';
import Image from 'next/image';
import Toast from '../ui/Toast';

export class Trash extends Component {
    constructor() {
        super();
        this.initialItems = [
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
            items: this.initialItems,
            selected: [],
            empty: false,
            showEmptyModal: false,
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            toast: null,
        };

        this.modalRef = createRef();
        this.confirmRef = createRef();
        this.contentRef = createRef();
        this.lastFocused = null;
    }

    componentDidMount() {
        // get user preference from local-storage
        let wasEmpty = localStorage.getItem("trash-empty");
        if (wasEmpty !== null && wasEmpty !== undefined) {
            if (wasEmpty === "true") this.setState({ items: [], empty: true });
        }
    }

    focusFile = (e) => {
        // icon
        const children = e.currentTarget.children;
        if (children[0]) children[0].classList.toggle("opacity-60");
        // file name
        if (children[1]) children[1].classList.toggle("bg-ub-orange");
    }

    toggleSelect = (index) => {
        this.setState(prev => {
            const selected = prev.selected.includes(index)
                ? prev.selected.filter(i => i !== index)
                : [...prev.selected, index];
            return { selected };
        });
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
        this.setState({ toast: { message, undoAction } });
    };

    undo = () => {
        if (this.state.toast?.undoAction) this.state.toast.undoAction();
        this.setState({ toast: null });
    };

    emptyTrash = () => {
        this.lastFocused = document.activeElement;
        this.setState({ showEmptyModal: true }, () => {
            const first = this.modalRef.current?.querySelector('button');
            first && first.focus();
            document.addEventListener('keydown', this.handleModalKey);
        });
    };

    handleModalKey = (e) => {
        if (!this.state.showEmptyModal) return;
        const focusable = this.modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelEmptyTrash();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const elements = Array.from(focusable);
            const index = elements.indexOf(document.activeElement);
            const next = (index + (e.shiftKey ? -1 : 1) + elements.length) % elements.length;
            elements[next].focus();
        }
    };

    confirmEmptyTrash = () => {
        const prevItems = this.state.items;
        this.setState({ items: [], selected: [], empty: true, showEmptyModal: false }, () => {
            localStorage.setItem('trash-empty', true);
            this.showUndoToast(() => {
                this.setState({ items: prevItems, empty: false });
                localStorage.setItem('trash-empty', false);
            }, 'Trash emptied');
        });
        document.removeEventListener('keydown', this.handleModalKey);
        this.lastFocused && this.lastFocused.focus();
    };

    cancelEmptyTrash = () => {
        document.removeEventListener('keydown', this.handleModalKey);
        this.setState({ showEmptyModal: false }, () => {
            this.lastFocused && this.lastFocused.focus();
        });
    };

    restoreSelected = () => {
        const { items, selected } = this.state;
        if (selected.length === 0) return;
        const remaining = items.filter((_, i) => !selected.includes(i));
        this.setState({ items: remaining, selected: [], empty: remaining.length === 0 }, () => {
            localStorage.setItem('trash-empty', remaining.length === 0);
        });
    }

    restoreAll = () => {
        const { items } = this.state;
        if (items.length === 0) return;
        this.setState({ items: [], selected: [], empty: true }, () => {
            localStorage.setItem('trash-empty', true);
        });
    }

    emptyScreen = () => {
        return (
            <div className="flex-grow flex flex-col justify-center items-center">
                <Image
                    className="w-24"
                    src="/themes/Yaru/status/user-trash-symbolic.svg"
                    alt="Empty trash can icon"
                    width={96}
                    height={96}
                    sizes="96px"
                />
                <span className="font-bold mt-4 text-xl px-1 text-gray-400">Trash is empty</span>
                <span className="mt-2 text-gray-400">No items to restore</span>
            </div>
        );
    }

    showTrashItems = () => {
        return (
            <div className="flex-grow ml-4 flex flex-wrap items-start content-start justify-start overflow-y-auto windowMainScreen">
                {
                    this.state.items.map((item, index) => {
                        const selected = this.state.selected.includes(index);
                        return (
                            <div
                                key={index}
                                role="button"
                                aria-pressed={selected}
                                tabIndex={0}
                                onFocus={this.focusFile}
                                onBlur={this.focusFile}
                                onClick={() => this.toggleSelect(index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        this.toggleSelect(index);
                                    }
                                }}
                                className={`trash-item flex flex-col items-center text-sm outline-none w-16 my-2 mx-4 rounded focus:ring-2 focus:ring-ub-orange ${selected ? 'opacity-60' : ''}`}
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
            this.lastFocused = document.activeElement;
            this.setState({ fileHandle: handle, filePreview: preview, confirmDelete: true }, () => {
                const first = this.confirmRef.current?.querySelector('button');
                first && first.focus();
                document.addEventListener('keydown', this.handleConfirmKey);
            });
        } catch (err) {
            console.error(err);
        }
    }

    deleteSelected = async () => {
        const { fileHandle, filePreview, items } = this.state;
        if (!fileHandle) return;
        const newItem = {
            name: fileHandle.name,
            icon: "/themes/Yaru/system/folder.png",
        };
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        const newItems = [...items, newItem];
        this.setState({
            items: newItems,
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            empty: false,
        }, () => {
            document.removeEventListener('keydown', this.handleConfirmKey);
            this.lastFocused && this.lastFocused.focus();
            localStorage.setItem('trash-empty', false);
            this.showUndoToast(() => {
                this.setState(prev => {
                    const remaining = prev.items.filter((_, i) => i !== newItems.length - 1);
                    const empty = remaining.length === 0;
                    localStorage.setItem('trash-empty', empty);
                    return { items: remaining, empty };
                });
            }, `${fileHandle.name} moved to Trash`);
        });
    }

    cancelDelete = () => {
        const { filePreview } = this.state;
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        document.removeEventListener('keydown', this.handleConfirmKey);
        this.setState({ fileHandle: null, filePreview: null, confirmDelete: false }, () => {
            this.lastFocused && this.lastFocused.focus();
        });
    }

    handleConfirmKey = (e) => {
        if (!this.state.confirmDelete) return;
        const focusable = this.confirmRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelDelete();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const elements = Array.from(focusable);
            const index = elements.indexOf(document.activeElement);
            const next = (index + (e.shiftKey ? -1 : 1) + elements.length) % elements.length;
            elements[next].focus();
        }
    }

    render() {
        const { showEmptyModal, confirmDelete } = this.state;
        const anyModal = showEmptyModal || confirmDelete;
        return (
            <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none relative">
                <div ref={this.contentRef} aria-hidden={anyModal ? 'true' : undefined}>
                    <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
                        <span className="font-bold ml-2">Trash</span>
        
                        <div className="flex">
                            <button
                                onClick={this.restoreSelected}
                                disabled={this.state.selected.length === 0}
                                className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 text-gray-300 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
                            >
                                Restore
                            </button>
                            <button
                                onClick={this.restoreAll}
                                disabled={this.state.items.length === 0}
                                className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 text-gray-300 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
                            >
                                Restore All
                            </button>
                            <button
                                onClick={this.emptyTrash}
                                disabled={this.state.items.length === 0}
                                className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
                            >
                                Empty
                            </button>
                            <button
                                onClick={this.selectFile}
                                className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                            >
                                Delete File
                            </button>
                        </div>
                    </div>
                    {this.state.empty ? this.emptyScreen() : this.showTrashItems()}
                </div>
                {showEmptyModal && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div
                            ref={this.modalRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="empty-trash-title"
                            className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full"
                        >
                            <h2 id="empty-trash-title" className="mb-4">Empty trash?</h2>
                            <div className="flex justify-end space-x-2">
                                <button onClick={this.confirmEmptyTrash} className="px-3 py-1 bg-red-600 rounded">Empty</button>
                                <button onClick={this.cancelEmptyTrash} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {confirmDelete && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div
                            ref={this.confirmRef}
                            className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full"
                            role="dialog"
                            aria-modal="true"
                        >
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
                {this.state.toast && (
                    <Toast
                        message={this.state.toast.message}
                        actionLabel={this.state.toast.undoAction ? 'Undo' : undefined}
                        onAction={this.undo}
                        onClose={() => this.setState({ toast: null })}
                    />
                )}
            </div>
        )
    }
}

export default Trash;

export const displayTrash = () => {
    return <Trash> </Trash>;
}
