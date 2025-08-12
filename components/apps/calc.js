import React, { useState, useEffect, useRef } from 'react';
import { evaluateExpression, navigateHistory, HELP_TEXT } from './calcUtils.mjs';

const xss = (str) => {
    if (!str) return '';
    return str.split('').map(char => {
        switch (char) {
            case '&':
                return '&amp';
            case '<':
                return '&lt';
            case '>':
                return '&gt';
            case '"':
                return '&quot';
            case "'":
                return '&#x27';
            case '/':
                return '&#x2F';
            default:
                return char;
        }
    }).join('');
};

export default function Calc() {
    const [rows, setRows] = useState([{ id: 0, command: '', result: '' }]);
    const [currentInput, setCurrentInput] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);
    const history = useRef([]);
    const historyIndex = useRef(-1);
    const variables = useRef({});
    const inputRef = useRef(null);

    const currentRow = rows[rows.length - 1];

    useEffect(() => {
        inputRef.current?.focus();
        const interval = setInterval(() => setCursorVisible(v => !v), 500);
        return () => clearInterval(interval);
    }, [currentRow.id]);

    const handleCommands = (command) => {
        const words = command.split(' ').filter(Boolean);
        const main = words[0];
        switch (main) {
            case 'exit':
                if (typeof document !== 'undefined') {
                    document.getElementById('close-calc')?.click();
                }
                return '';
            case 'help':
                return HELP_TEXT;
            default:
                return evaluateExpression(command, variables.current);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const command = currentInput.trim();
            if (command.length === 0) return;
            history.current.push(command);
            historyIndex.current = history.current.length - 1;
            if (command === 'clear') {
                setRows([{ id: 0, command: '', result: '' }]);
                setCurrentInput('');
                variables.current = {};
                return;
            }
            const result = handleCommands(command);
            setRows(prev => {
                const newRows = [...prev];
                newRows[newRows.length - 1] = { id: currentRow.id, command, result };
                newRows.push({ id: currentRow.id + 2, command: '', result: '' });
                return newRows;
            });
            setCurrentInput('');
        } else if (e.key === 'ArrowUp') {
            const res = navigateHistory(history.current, historyIndex.current, 'up');
            historyIndex.current = res.index;
            setCurrentInput(res.cmd);
        } else if (e.key === 'ArrowDown') {
            const res = navigateHistory(history.current, historyIndex.current, 'down');
            if (res.cmd === null) return;
            historyIndex.current = res.index;
            setCurrentInput(res.cmd);
        }
    };

    return (
        <div className="h-full w-full bg-ub-drk-abrgn text-ubt-grey opacity-100 p-1 float-left font-normal">
            <div>C-style arbitary precision calculator (version 2.12.7.2)</div>
            <div>Calc is open software.</div>
            <div>[ type "exit" to exit, "clear" to clear, "help" for help.]</div>
            <div className="text-white text-sm font-bold bg-ub-drk-abrgn" id="calculator-body">
                {rows.map(row => (
                    <React.Fragment key={row.id}>
                        <div className=" flex p-2 text-ubt-grey opacity-100 mt-1 float-left font-normal "></div>
                        <div className="flex w-full h-5">
                            <div className=" flex text-ubt-green h-1 mr-2"> {'$'} </div>
                            <div className=" bg-transparent relative flex-1 overflow-hidden" onClick={() => inputRef.current?.focus()}>
                                <span className=" float-left whitespace-pre pb-1 opacity-100 font-normal tracking-wider">{row.id === currentRow.id ? xss(currentInput) : xss(row.command)}</span>
                                {row.id === currentRow.id && (
                                    <div className=" float-left mt-1 w-1.5 h-3.5 bg-white" style={{ visibility: cursorVisible ? 'visible' : 'hidden' }}></div>
                                )}
                                {row.id === currentRow.id && (
                                    <input
                                        ref={inputRef}
                                        className=" absolute top-0 left-0 w-full opacity-0 outline-none bg-transparent"
                                        spellCheck={false}
                                        autoComplete="off"
                                        type="text"
                                        value={currentInput}
                                        onChange={e => setCurrentInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                )}
                            </div>
                        </div>
                        {row.result !== '' && (
                            <pre className="my-2 font-normal">{xss(String(row.result))}</pre>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

export const displayTerminalCalc = (addFolder, openApp) => {
    return <Calc addFolder={addFolder} openApp={openApp}> </Calc>;
};
