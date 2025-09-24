'use client';

import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

loader.config({ monaco });

export default Editor;
