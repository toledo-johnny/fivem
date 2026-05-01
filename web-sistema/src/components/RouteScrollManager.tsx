import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollToHash(hash: string, attempt = 0) {
  const element = document.getElementById(hash.replace('#', ''));

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (attempt < 8) {
    window.setTimeout(() => scrollToHash(hash, attempt + 1), 80);
  }
}

export default function RouteScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.hash, location.pathname]);

  return null;
}
