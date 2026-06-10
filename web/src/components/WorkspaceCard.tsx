import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { WorkspaceTagsEditor } from '@/components/WorkspaceTagsEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface WorkspaceCardProps {
    workspace: WorkspaceSummary;
    onUpdated: (workspace: WorkspaceSummary) => void;
    onDeleted: (workspaceId: string) => void;
}

export function WorkspaceCard({ workspace, onUpdated, onDeleted }: WorkspaceCardProps) {
    const navigate = useNavigate();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [title, setTitle] = useState(workspace.title);
    const [tags, setTags] = useState(workspace.tags);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!editOpen) return;
        setTitle(workspace.title);
        setTags(workspace.tags);
    }, [editOpen, workspace.title, workspace.tags]);

    const openEditor = () => {
        navigate(`/code/${workspace.id}`);
    };

    const saveEdit = async () => {
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
            onUpdated(updated);
            setEditOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/_api/workspaces/${workspace.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) return;
            onDeleted(workspace.id);
            setDeleteOpen(false);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <Card
                role="button"
                tabIndex={0}
                className="relative cursor-pointer transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={openEditor}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openEditor();
                    }
                }}
            >
                <div
                    className="absolute right-3 top-3 z-10 flex gap-1"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit ${workspace.title}`}
                        onClick={() => setEditOpen(true)}
                    >
                        <Pencil />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={`Delete ${workspace.title}`}
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash2 />
                    </Button>
                </div>

                <CardHeader className="pr-20">
                    <CardTitle className="line-clamp-2">{workspace.title}</CardTitle>
                    <CardDescription className="flex flex-wrap gap-1.5 pt-1">
                        {workspace.tags.length > 0 ? (
                            workspace.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))
                        ) : (
                            <span>No tags</span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                    Updated {new Date(workspace.updatedAt).toLocaleString()}
                </CardContent>
            </Card>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <DialogHeader>
                        <DialogTitle>Edit workspace</DialogTitle>
                        <DialogDescription>
                            Update the title and tags for this workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor={`workspace-title-${workspace.id}`}>Title</Label>
                            <Input
                                id={`workspace-title-${workspace.id}`}
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tags</Label>
                            <WorkspaceTagsEditor
                                tags={tags}
                                onChange={setTags}
                                disabled={saving}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="button" onClick={() => void saveEdit()} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <DialogHeader>
                        <DialogTitle>Delete workspace</DialogTitle>
                        <DialogDescription>
                            This will permanently delete &quot;{workspace.title}&quot; and its
                            files. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => void confirmDelete()}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
