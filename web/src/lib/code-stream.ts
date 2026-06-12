export interface CursorCoordinates {
    line: number;
    column: number;
}

export interface MonacoContentChange {
    range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    };
    rangeOffset: number;
    rangeLength: number;
    text: string;
}

export interface CodeInputPayload {
    roomSlug: string;
    activeFileId: string;
    changes: MonacoContentChange[];
    cursorCoordinates: CursorCoordinates;
    fileValueString: string;
}

export interface CodeSwitchPayload {
    roomSlug: string;
    activeFileId: string;
    cursorCoordinates: CursorCoordinates;
    fileValueString: string;
}

export interface CodeCursorPayload {
    roomSlug: string;
    activeFileId: string;
    cursorCoordinates: CursorCoordinates;
}

export interface FilesStreamPayload {
    roomSlug: string;
    files: Array<{ path: string }>;
    activeFileId: string;
}
