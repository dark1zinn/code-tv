import type { Monaco } from '@monaco-editor/react';

type CompletionKind = Monaco['languages']['CompletionItemKind'];
type CompletionItem = Monaco['languages']['CompletionItem'];
type ITextModel = Monaco['editor']['ITextModel'];
type Position = Monaco['Position'];

interface CompletionEntry {
    label: string;
    insertText: string;
    kind: 'keyword' | 'snippet' | 'function' | 'struct';
}

const RUST: CompletionEntry[] = [
    { label: 'fn', insertText: 'fn ', kind: 'keyword' },
    { label: 'let', insertText: 'let ', kind: 'keyword' },
    { label: 'mut', insertText: 'mut ', kind: 'keyword' },
    { label: 'impl', insertText: 'impl ', kind: 'keyword' },
    { label: 'struct', insertText: 'struct ', kind: 'keyword' },
    { label: 'enum', insertText: 'enum ', kind: 'keyword' },
    { label: 'trait', insertText: 'trait ', kind: 'keyword' },
    { label: 'match', insertText: 'match ', kind: 'keyword' },
    { label: 'if', insertText: 'if ', kind: 'keyword' },
    { label: 'else', insertText: 'else ', kind: 'keyword' },
    { label: 'for', insertText: 'for ', kind: 'keyword' },
    { label: 'while', insertText: 'while ', kind: 'keyword' },
    { label: 'loop', insertText: 'loop ', kind: 'keyword' },
    { label: 'return', insertText: 'return ', kind: 'keyword' },
    { label: 'pub', insertText: 'pub ', kind: 'keyword' },
    { label: 'use', insertText: 'use ', kind: 'keyword' },
    { label: 'mod', insertText: 'mod ', kind: 'keyword' },
    { label: 'Option', insertText: 'Option', kind: 'struct' },
    { label: 'Result', insertText: 'Result', kind: 'struct' },
    { label: 'Vec', insertText: 'Vec', kind: 'struct' },
    { label: 'String', insertText: 'String', kind: 'struct' },
    { label: 'println!', insertText: 'println!($0)', kind: 'function' },
    { label: 'vec!', insertText: 'vec![$0]', kind: 'function' },
    { label: 'format!', insertText: 'format!($0)', kind: 'function' },
    {
        label: 'fn main',
        insertText: 'fn main() {\n\t$0\n}',
        kind: 'snippet',
    },
    {
        label: 'if let',
        insertText: 'if let $1 = $2 {\n\t$0\n}',
        kind: 'snippet',
    },
];

const GO: CompletionEntry[] = [
    { label: 'package', insertText: 'package ', kind: 'keyword' },
    { label: 'import', insertText: 'import ', kind: 'keyword' },
    { label: 'func', insertText: 'func ', kind: 'keyword' },
    { label: 'var', insertText: 'var ', kind: 'keyword' },
    { label: 'const', insertText: 'const ', kind: 'keyword' },
    { label: 'type', insertText: 'type ', kind: 'keyword' },
    { label: 'struct', insertText: 'struct ', kind: 'keyword' },
    { label: 'interface', insertText: 'interface ', kind: 'keyword' },
    { label: 'if', insertText: 'if ', kind: 'keyword' },
    { label: 'else', insertText: 'else ', kind: 'keyword' },
    { label: 'for', insertText: 'for ', kind: 'keyword' },
    { label: 'range', insertText: 'range ', kind: 'keyword' },
    { label: 'return', insertText: 'return ', kind: 'keyword' },
    { label: 'go', insertText: 'go ', kind: 'keyword' },
    { label: 'defer', insertText: 'defer ', kind: 'keyword' },
    { label: 'make', insertText: 'make($0)', kind: 'function' },
    { label: 'len', insertText: 'len($0)', kind: 'function' },
    { label: 'append', insertText: 'append($0)', kind: 'function' },
    { label: 'fmt.Println', insertText: 'fmt.Println($0)', kind: 'function' },
    { label: 'fmt.Printf', insertText: 'fmt.Printf($0)', kind: 'function' },
    {
        label: 'func main',
        insertText: 'func main() {\n\t$0\n}',
        kind: 'snippet',
    },
];

const CPP: CompletionEntry[] = [
    { label: 'include', insertText: '#include <$0>', kind: 'snippet' },
    { label: 'namespace', insertText: 'namespace $1 {\n\t$0\n}', kind: 'snippet' },
    { label: 'class', insertText: 'class ', kind: 'keyword' },
    { label: 'struct', insertText: 'struct ', kind: 'keyword' },
    { label: 'template', insertText: 'template ', kind: 'keyword' },
    { label: 'public', insertText: 'public:', kind: 'keyword' },
    { label: 'private', insertText: 'private:', kind: 'keyword' },
    { label: 'protected', insertText: 'protected:', kind: 'keyword' },
    { label: 'virtual', insertText: 'virtual ', kind: 'keyword' },
    { label: 'override', insertText: 'override ', kind: 'keyword' },
    { label: 'const', insertText: 'const ', kind: 'keyword' },
    { label: 'return', insertText: 'return ', kind: 'keyword' },
    { label: 'if', insertText: 'if ', kind: 'keyword' },
    { label: 'else', insertText: 'else ', kind: 'keyword' },
    { label: 'for', insertText: 'for ', kind: 'keyword' },
    { label: 'while', insertText: 'while ', kind: 'keyword' },
    { label: 'std::vector', insertText: 'std::vector<$0>', kind: 'struct' },
    { label: 'std::string', insertText: 'std::string', kind: 'struct' },
    { label: 'std::cout', insertText: 'std::cout', kind: 'function' },
    {
        label: 'int main',
        insertText: 'int main() {\n\t$0\n\treturn 0;\n}',
        kind: 'snippet',
    },
];

const MARKDOWN: CompletionEntry[] = [
    { label: 'heading1', insertText: '# $0', kind: 'snippet' },
    { label: 'heading2', insertText: '## $0', kind: 'snippet' },
    { label: 'heading3', insertText: '### $0', kind: 'snippet' },
    { label: 'link', insertText: '[$1]($0)', kind: 'snippet' },
    { label: 'codeblock', insertText: '```\n$0\n```', kind: 'snippet' },
    { label: 'bold', insertText: '**$0**', kind: 'snippet' },
    { label: 'italic', insertText: '*$0*', kind: 'snippet' },
    { label: 'list', insertText: '- $0', kind: 'snippet' },
];

const LANGUAGE_COMPLETIONS: Record<string, CompletionEntry[]> = {
    rust: RUST,
    go: GO,
    cpp: CPP,
    c: CPP,
    markdown: MARKDOWN,
};

function toKind(monaco: Monaco, kind: CompletionEntry['kind']): CompletionKind {
    const kinds = monaco.languages.CompletionItemKind;
    switch (kind) {
        case 'snippet':
            return kinds.Snippet;
        case 'function':
            return kinds.Function;
        case 'struct':
            return kinds.Struct;
        default:
            return kinds.Keyword;
    }
}

function buildSuggestions(
    monaco: Monaco,
    entries: CompletionEntry[],
    range: CompletionItem['range'],
    prefix: string,
): CompletionItem[] {
    const lower = prefix.toLowerCase();
    return entries
        .filter((entry) => !prefix || entry.label.toLowerCase().startsWith(lower))
        .map((entry) => ({
            label: entry.label,
            kind: toKind(monaco, entry.kind),
            insertText: entry.insertText,
            insertTextRules: entry.insertText.includes('$')
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
            range,
        }));
}

let registered = false;

export function registerMonacoCompletions(monaco: Monaco): void {
    if (registered) return;
    registered = true;

    for (const [languageId, entries] of Object.entries(LANGUAGE_COMPLETIONS)) {
        monaco.languages.registerCompletionItemProvider(languageId, {
            triggerCharacters: ['.', '#', ':', '<'],
            provideCompletionItems(model: ITextModel, position: Position) {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };
                return {
                    suggestions: buildSuggestions(monaco, entries, range, word.word),
                };
            },
        });
    }
}
