import { useEffect, useRef } from 'react';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOCUS_CHAT_SHORTCUT_LABEL } from '@/lib/keyboard-shortcuts';
import type { SidebarAlignment } from '@/hooks/useEditorLayout';

export interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
    color?: string;
}

interface LiveChatProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    onToggle: () => void;
    collapseSide?: SidebarAlignment;
}

export function LiveChat({
    messages,
    onSend,
    onToggle,
    collapseSide = 'right',
}: LiveChatProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const CollapseIcon = collapseSide === 'left' ? PanelLeftClose : PanelRightClose;

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <aside className="flex h-full w-full flex-col border-divider bg-bg-sidecar border-l">
            <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                <span className="text-sm font-semibold">Live Chat</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Hide chat sidebar"
                    onClick={onToggle}
                >
                    <CollapseIcon />
                </Button>
            </div>
            <div
                ref={logRef}
                aria-live="log"
                aria-relevant="additions"
                className="flex-1 overflow-y-auto p-3 text-sm"
            >
                {messages.map((message) => (
                    <p key={`${message.timestamp}-${message.sender}`} className="mb-2">
                        <span
                            className="font-semibold"
                            style={{ color: message.color ?? 'var(--color-accent, #58a6ff)' }}
                        >
                            {message.sender}
                        </span>
                        : {message.text}
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
                    placeholder={FOCUS_CHAT_SHORTCUT_LABEL}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            inputRef.current?.blur();
                        }
                    }}
                />
            </form>
        </aside>
    );
}

export function focusChatInput() {
    const input = document.getElementById('live-room-chat') as HTMLInputElement | null;
    input?.focus();
}
