import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ProfileDialogProps {
    username: string;
    onUsernameChange: (username: string) => void;
}

export function ProfileDialog({ username, onUsernameChange }: ProfileDialogProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(username);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDraft(username);
    }, [username]);

    const save = async () => {
        setSaving(true);
        try {
            const response = await fetch('/_api/profile', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ username: draft }),
            });
            if (response.ok) {
                const body = (await response.json()) as { username: string };
                onUsernameChange(body.username);
                setOpen(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const initials = username.slice(0, 2).toUpperCase();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Profile">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Profile</DialogTitle>
                    <DialogDescription>Update your display name for streams and chat.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                    </div>
                    <Button type="button" onClick={() => void save()} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
