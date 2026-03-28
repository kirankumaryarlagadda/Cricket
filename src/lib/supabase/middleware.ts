import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publicPaths = ['/login', '/signup', '/pending-approval', '/reset-password', '/force-reset'];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );
  const isApiPath = request.nextUrl.pathname.startsWith('/api');

  if (!user && !isPublicPath && !isApiPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in, check force password reset
  if (user && !isPublicPath && !isApiPath) {
    // Force password reset takes priority
    if (user.user_metadata?.force_password_reset && !request.nextUrl.pathname.startsWith('/force-reset')) {
      const url = request.nextUrl.clone();
      url.pathname = '/force-reset';
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single();

    if (profile && !profile.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = '/pending-approval';
      return NextResponse.redirect(url);
    }
  }

  // If user is logged in and trying to access login/signup, redirect to home
  if (user && isPublicPath && !request.nextUrl.pathname.startsWith('/pending-approval') && !request.nextUrl.pathname.startsWith('/force-reset')) {
    // If force reset is needed, let them stay on force-reset
    if (user.user_metadata?.force_password_reset) {
      if (!request.nextUrl.pathname.startsWith('/force-reset')) {
        const url = request.nextUrl.clone();
        url.pathname = '/force-reset';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // But first check if approved
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single();

    if (profile?.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
