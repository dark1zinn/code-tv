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
import { DEFAULT_CHAT_COLOR, fetchProfile, type ProfileData } from '@/lib/profile';

interface ProfileDialogProps {
    username: string;
    onUsernameChange: (username: string) => void;
}

const emptyDraft = (): ProfileData => ({
    username: '',
    githubLink: '',
    youtubeLink: '',
    chatColor: DEFAULT_CHAT_COLOR,
});

export function ProfileDialog({ username, onUsernameChange }: ProfileDialogProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<ProfileData>(emptyDraft());
    const [avatarColor, setAvatarColor] = useState(DEFAULT_CHAT_COLOR);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const profile = await fetchProfile();
            setDraft({
                username: profile.username,
                githubLink: profile.githubLink ?? '',
                youtubeLink: profile.youtubeLink ?? '',
                chatColor: profile.chatColor || DEFAULT_CHAT_COLOR,
            });
            setAvatarColor(profile.chatColor || DEFAULT_CHAT_COLOR);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadProfile();
    }, []);

    useEffect(() => {
        if (!open) return;
        void loadProfile();
    }, [open]);

    const save = async () => {
        setSaving(true);
        try {
            const response = await fetch('/_api/profile', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    username: draft.username,
                    githubLink: draft.githubLink.trim() || null,
                    youtubeLink: draft.youtubeLink.trim() || null,
                    chatColor: draft.chatColor,
                }),
            });
            if (response.ok) {
                const body = (await response.json()) as ProfileData;
                onUsernameChange(body.username);
                setAvatarColor(body.chatColor || DEFAULT_CHAT_COLOR);
                setOpen(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const displayName = username || draft.username || 'User';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Profile">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback
                            className="text-xs text-white"
                            style={{ backgroundColor: avatarColor }}
                        >
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Profile</DialogTitle>
                    <DialogDescription>
                        Update your display name, social links, and chat color.
                    </DialogDescription>
                </DialogHeader>
                {loading ? (
                    <p className="py-4 text-sm text-muted-foreground">Loading profile...</p>
                ) : (
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={draft.username}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        username: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="github-link">GitHub link</Label>
                            <Input
                                id="github-link"
                                type="url"
                                placeholder="https://github.com/you"
                                value={draft.githubLink}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        githubLink: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="youtube-link">YouTube link</Label>
                            <Input
                                id="youtube-link"
                                type="url"
                                placeholder="https://youtube.com/@you"
                                value={draft.youtubeLink}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        youtubeLink: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="chat-color">Chat color</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="chat-color"
                                    type="color"
                                    value={draft.chatColor}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            chatColor: event.target.value,
                                        }))
                                    }
                                    className="h-10 w-14 cursor-pointer p-1"
                                />
                                <Input
                                    value={draft.chatColor}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            chatColor: event.target.value,
                                        }))
                                    }
                                    placeholder="#58a6ff"
                                    className="font-mono text-sm"
                                />
                            </div>
                            <p className="text-sm">
                                Preview:{' '}
                                <span
                                    className="font-semibold"
                                    style={{ color: draft.chatColor }}
                                >
                                    {draft.username || 'Your name'}
                                </span>
                            </p>
                        </div>
                        <Button type="button" onClick={() => void save()} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
