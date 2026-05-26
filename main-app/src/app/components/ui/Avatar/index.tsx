import Image from 'next/image';
import { getInitials, avatarColor, cn } from '@lib/utils';

interface AvatarProps {
  name?: string;
  src?: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
const dotSizes = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
const pxSizes = { xs: 24, sm: 32, md: 40, lg: 48 };

export default function Avatar({ name, src, id = '', size = 'md', online, className }: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <Image
          src={src}
          alt={name ?? ''}
          width={pxSizes[size]}
          height={pxSizes[size]}
          className={cn('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <div className={cn('rounded-full flex items-center justify-center font-bold text-white', sizes[size], avatarColor(id))}>
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-slate-900',
          dotSizes[size],
          online ? 'bg-emerald-400' : 'bg-slate-500'
        )} />
      )}
    </div>
  );
}