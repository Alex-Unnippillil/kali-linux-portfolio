import React, { Component } from 'react';
import Image from 'next/image';
import {
    getDeletedFiles,
    markDeleted,
    restoreFile,
    emptyTrash as vfsEmptyTrash,
} from '../../utils/virtualFs';

export class Trash extends Component {
    constructor() {
        super();
        this.state = {
            empty: false,
            trashItems: [],
            selectedIndex: null,
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
        };
    }

    componentDidMount() {
        const items = getDeletedFiles();
        this.setState({ trashItems: items, empty: items.length === 0 });
    }

    focusFile = (e, index) => {
        const children = e.currentTarget.children;
        if (children[0]) children[0].classList.toggle("opacity-60");
        if (children[1]) children[1].classList.toggle("bg-ub-orange");
        if (typeof index === 'number') {
            this.setState({ selectedIndex: index });
        } else {
            this.setState({ selectedIndex: null });
        }
    }

    emptyTrash = () => {
        vfsEmptyTrash();
        this.setState({ trashItems: [], empty: true, selectedIndex: null });
    };

    restoreSelected = () => {
        const { selectedIndex, trashItems } = this.state;
        if (selectedIndex === null) return;
        const item = trashItems[selectedIndex];
        restoreFile(item.originalPath);
        const items = getDeletedFiles();
        this.setState({
            trashItems: items,
            empty: items.length === 0,
            selectedIndex: null,
        });
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
        const { trashItems } = this.state;
        return (
            <div className="flex-grow ml-4 flex flex-wrap items-start content-start justify-start overflow-y-auto windowMainScreen">
                {trashItems.map((item, index) => {
                    return (
                        <div
                            key={index}
                            tabIndex="1"
                            onFocus={(e) => this.focusFile(e, index)}
                            onBlur={this.focusFile}
                            className="flex flex-col items-center text-sm outline-none w-16 my-2 mx-4"
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
                    );
                })}
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
        markDeleted({
            name: fileHandle.name,
            icon: '/themes/Yaru/system/folder.png',
            originalPath: fileHandle.name,
        });
        const items = getDeletedFiles();
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        this.setState({
            fileHandle: null,
            filePreview: null,
            confirmDelete: false,
            trashItems: items,
            empty: items.length === 0,
        });
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
                        <div onClick={this.restoreSelected} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80">Restore</div>
                        <div onClick={this.emptyTrash} className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80">Empty</div>
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
            </div>
        )
    }
}

export default Trash;

export const displayTrash = () => {
    return <Trash> </Trash>;
}
