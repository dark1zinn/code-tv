import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildWatchLink, copyToClipboard } from '@/lib/share-link';

interface ShareLinkButtonProps {
    url?: string;
    workspaceId?: string;
}

export function ShareLinkButton({ url, workspaceId }: ShareLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const target =
            url ?? (workspaceId ? buildWatchLink(workspaceId) : window.location.href);
        const ok = await copyToClipboard(target);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Button variant="outline" size="sm" type="button" onClick={() => void handleShare()}>
            <Link2 className="h-4 w-4" />
            {copied ? 'Copied!' : 'Share'}
        </Button>
    );
}
