'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [initials, setInitials] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Try to get display name from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) {
          const parts = profile.display_name.trim().split(' ');
          setInitials(
            parts.length >= 2
              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              : parts[0].slice(0, 2).toUpperCase()
          );
        } else if (user.email) {
          setInitials(user.email.slice(0, 2).toUpperCase());
        }
      }
    };

    getUser();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Matches' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/my-picks', label: 'My Picks' },
  ];

  return (
    <nav className="navbar">
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
        }}
      >
        {/* Left: Logo */}
        <Link
          href="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span style={{ fontSize: '1.5rem' }}>🏏</span>
          <span
            className="gradient-text"
            style={{ fontWeight: 800, fontSize: '1.15rem' }}
          >
            IPL Picks 2026
          </span>
        </Link>

        {/* Center: Nav links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Avatar + Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div
            className="avatar"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Account"
          >
            {initials || '??'}
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '0.5rem',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                border: '1px solid #e2e8f0',
                minWidth: '160px',
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#f56565',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#fff5f5')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}