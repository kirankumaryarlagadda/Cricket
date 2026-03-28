import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, user_id } = await request.json();

    if (!action || !user_id) {
      return NextResponse.json({ error: 'action and user_id are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject' && action !== 'remove' && action !== 'make-admin' && action !== 'demote-admin' && action !== 'reset-password') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Prevent removing yourself
    if ((action === 'reject' || action === 'remove') && user_id === user.id) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    if (action === 'make-admin') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to make admin' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Player is now an admin' });
    }

    if (action === 'reset-password') {
      // Get the user's email
      const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);

      if (userError || !targetUser?.user?.email) {
        return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
      }

      // Set a temporary password and mark user for forced reset
      const tempPassword = `TempReset_${Date.now()}!`;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: tempPassword,
        user_metadata: { force_password_reset: true },
      });

      if (updateError) {
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Password reset for ${targetUser.user.email}`,
        temp_password: tempPassword,
        email: targetUser.user.email,
      });
    }

    if (action === 'demote-admin') {
      // Prevent demoting yourself
      if (user_id === user.id) {
        return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', user_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to remove admin access' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Admin access removed' });
    }

    if (action === 'approve') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', user_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to approve player' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Player approved successfully' });
    }

    if (action === 'reject' || action === 'remove') {
      // Delete all their picks first
      await supabaseAdmin
        .from('picks')
        .delete()
        .eq('user_id', user_id);

      // Delete from auth (cascades to profiles via FK)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 });
      }

      const label = action === 'reject' ? 'rejected' : 'removed';
      return NextResponse.json({ success: true, message: `Player ${label} successfully` });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
