import { useCachedMedia } from '@/hooks/use-offline-query';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface CachedImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function CachedImage({ src, alt, className, fallbackClassName }: CachedImageProps) {
  const { src: cachedSrc, isLoading, isCached } = useCachedMedia(src);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!cachedSrc) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', fallbackClassName || className)}>
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={cachedSrc}
        alt={alt}
        className={className}
        loading="lazy"
      />

    </div>
  );
}