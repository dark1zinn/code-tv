import { useEffect, useRef, useState } from 'react';
import { WorkspaceTagsEditor } from '@/components/WorkspaceTagsEditor';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface WorkspaceSummary {
    id: string;
    title: string;
    tags: string[];
    updatedAt: string;
}

interface WorkspaceEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspace: WorkspaceSummary;
    dialogTitle: string;
    dialogDescription: string;
    saveLabel?: string;
    onSaved: (workspace: WorkspaceSummary) => void;
    onDismiss?: () => void;
}

export function WorkspaceEditDialog({
    open,
    onOpenChange,
    workspace,
    dialogTitle,
    dialogDescription,
    saveLabel = 'Save',
    onSaved,
    onDismiss,
}: WorkspaceEditDialogProps) {
    const [title, setTitle] = useState(workspace.title);
    const [tags, setTags] = useState(workspace.tags);
    const [saving, setSaving] = useState(false);
    const savedViaButton = useRef(false);

    useEffect(() => {
        if (!open) return;
        savedViaButton.current = false;
        setTitle(workspace.title);
        setTags(workspace.tags);
    }, [open, workspace.id, workspace.title, workspace.tags]);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && !savedViaButton.current) {
            onDismiss?.();
        }
        if (!nextOpen) {
            savedViaButton.current = false;
        }
        onOpenChange(nextOpen);
    };

    const save = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/_api/workspaces/${workspace.id}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim() || 'Untitled Workspace',
                    tags,
                }),
            });
            if (!response.ok) return;
            const updated = (await response.json()) as WorkspaceSummary;
            savedViaButton.current = true;
            onSaved(updated);
            onOpenChange(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor={`workspace-title-${workspace.id}`}>Title</Label>
                        <Input
                            id={`workspace-title-${workspace.id}`}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            disabled={saving}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Tags</Label>
                        <WorkspaceTagsEditor tags={tags} onChange={setTags} disabled={saving} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={() => void save()} disabled={saving}>
                            {saving ? 'Saving...' : saveLabel}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
