import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check how many products currently have the old ID
  const { data: oldIdCount, error: oldIdErr } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', '11111111-1111-1111-1111-111111111111');

  // 2. Perform the update
  const { data: updatedData, error: updateErr } = await supabaseAdmin
    .from('products')
    .update({ seller_id: '7f4f4f3c-5ab0-46f0-8cf7-f5a7c59aaaff' })
    .eq('seller_id', '11111111-1111-1111-1111-111111111111')
    .select();

  if (updateErr) {
    return NextResponse.json({
      success: false,
      error: updateErr.message,
      debug: { oldIdCount }
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    updated_count: updatedData?.length || 0,
    message: `Successfully updated ${updatedData?.length || 0} products to new seller ID.`
  });
}
