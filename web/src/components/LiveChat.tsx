import { useEffect, useRef } from 'react';

export interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
}

interface LiveChatProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    visible: boolean;
    onToggle: () => void;
}

export function LiveChat({ messages, onSend, visible, onToggle }: LiveChatProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages]);

    if (!visible) {
        return (
            <button
                type="button"
                aria-label="Toggle live chat sidebar visibility"
                className="absolute right-2 top-2 rounded bg-bg-sidecar px-2 py-1 text-sm"
                onClick={onToggle}
            >
                Show Chat
            </button>
        );
    }

    return (
        <aside className="flex h-full w-80 flex-col border-l border-divider bg-bg-sidecar">
            <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                <span className="text-sm font-semibold">Live Chat</span>
                <button type="button" className="text-xs text-accent" onClick={onToggle}>
                    Hide
                </button>
            </div>
            <div
                ref={logRef}
                aria-live="log"
                aria-relevant="additions"
                className="flex-1 overflow-y-auto p-3 text-sm"
            >
                {messages.map((message) => (
                    <p key={`${message.timestamp}-${message.sender}`} className="mb-2">
                        <span className="font-semibold text-accent">{message.sender}</span>:{' '}
                        {message.text}
                    </p>
                ))}
            </div>
            <form
                className="border-t border-divider p-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    const value = inputRef.current?.value.trim();
                    if (!value) return;
                    onSend(value);
                    if (inputRef.current) inputRef.current.value = '';
                }}
            >
                <label htmlFor="live-room-chat" className="sr-only">
                    Live Room Chat Text Entry
                </label>
                <input
                    id="live-room-chat"
                    ref={inputRef}
                    className="w-full rounded border border-divider bg-bg-base px-2 py-1 text-sm"
                    placeholder="Send a message"
                />
            </form>
        </aside>
    );
}

export function focusChatInput() {
    const input = document.getElementById('live-room-chat') as HTMLInputElement | null;
    input?.focus();
}
