import { useState, type KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    MAX_WORKSPACE_TAGS,
    addWorkspaceTag,
    removeWorkspaceTag,
} from '@/lib/workspace-tags';

interface WorkspaceTagsEditorProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    disabled?: boolean;
}

export function WorkspaceTagsEditor({ tags, onChange, disabled }: WorkspaceTagsEditorProps) {
    const [draft, setDraft] = useState('');

    const commitDraft = () => {
        const next = addWorkspaceTag(tags, draft);
        if (!next) return;
        onChange(next);
        setDraft('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commitDraft();
        }
        if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            onChange(removeWorkspaceTag(tags, tags[tags.length - 1]!));
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                            type="button"
                            className="rounded-sm px-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            aria-label={`Remove ${tag} tag`}
                            disabled={disabled}
                            onClick={() => onChange(removeWorkspaceTag(tags, tag))}
                        >
                            ×
                        </button>
                    </Badge>
                ))}
                {tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tags yet</span>
                )}
            </div>
            <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={commitDraft}
                placeholder={
                    tags.length >= MAX_WORKSPACE_TAGS
                        ? 'Max 6 tags'
                        : 'Add lang or tech tag (Enter)'
                }
                disabled={disabled || tags.length >= MAX_WORKSPACE_TAGS}
                className="h-8"
            />
        </div>
    );
}
