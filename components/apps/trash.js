import React, { Component } from 'react';
import Image from 'next/image';
import { trash } from '../../utils/trash';

export class Trash extends Component {
    constructor() {
        super();
        this.state = {
            items: trash.list(),
            selectedId: null,
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            confirmEmpty: false,
        }
    }

    componentDidMount() {
        this.unsubscribe = trash.subscribe((items) => this.setState({ items }));
    }

    componentWillUnmount() {
        if (this.unsubscribe) this.unsubscribe();
    }

    focusFile = (e) => {
        // icon
        const children = e.currentTarget.children;
        if (children[0]) children[0].classList.toggle("opacity-60");
        // file name
        if (children[1]) children[1].classList.toggle("bg-ub-orange");
    }

    requestEmpty = () => {
        this.setState({ confirmEmpty: true });
    };

    emptyTrash = () => {
        trash.empty();
        this.setState({ selectedId: null, confirmEmpty: false });
    };

    cancelEmpty = () => {
        this.setState({ confirmEmpty: false });
    };

    restoreItem = () => {
        const { selectedId } = this.state;
        if (selectedId) {
            trash.restore(selectedId);
            this.setState({ selectedId: null });
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
                    this.state.items.map((item) => {
                        return (
                            <div key={item.id} tabIndex="1" onFocus={this.focusFile} onBlur={this.focusFile} onClick={() => this.setState({ selectedId: item.id })} className="flex flex-col items-center text-sm outline-none w-16 my-2 mx-4">
                                <div className="w-16 h-16 flex items-center justify-center">
                                    <Image
                                        src={item.payload?.icon || '/themes/Yaru/system/folder.png'}
                                        alt="Ubuntu File Icons"
                                        width={48}
                                        height={48}
                                        sizes="48px"
                                    />
                                </div>
                                <span className="text-center rounded px-0.5">{item.payload?.name || item.id}</span>
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
                    <span className="font-bold ml-2">Trash ({this.state.items.length})</span>
                    <div className="flex">
                        <div onClick={this.restoreItem} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded text-gray-300 hover:bg-opacity-80">Restore</div>
                        <div onClick={this.requestEmpty} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80">Empty</div>
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
                {this.state.confirmEmpty && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div className="bg-ub-warm-grey p-4 rounded shadow-md max-w-full">
                            <p className="mb-2">Empty trash? This will permanently delete {this.state.items.length} item(s).</p>
                            <div className="flex justify-end space-x-2">
                                <button onClick={this.emptyTrash} className="px-3 py-1 bg-red-600 rounded">Empty</button>
                                <button onClick={this.cancelEmpty} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                            </div>
                        </div>
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
