import { BRAND_LOGO_SRC } from '@/lib/brand';

interface BrandLogoProps {
    size?: 'sm' | 'md';
}

const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
} as const;

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
    return (
        <img
            src={BRAND_LOGO_SRC}
            alt=""
            aria-hidden
            className={`shrink-0 object-contain ${sizeClasses[size]}`}
        />
    );
}
