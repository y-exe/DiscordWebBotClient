import Link from 'next/link';
import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function useNavigate() {
  const router = useRouter();
  return useCallback((to, options = {}) => {
    if (options.replace) router.replace(to);
    else router.push(to);
  }, [router]);
}

export function useParams() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  return { guildId: parts[0], channelId: parts[1] };
}

export function useLocation() {
  return { pathname: usePathname() };
}

export function AppLink({ to, ...props }) {
  return <Link href={to} {...props} />;
}
