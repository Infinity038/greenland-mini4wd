// Supabase — wire up later:
// 1. npm install @supabase/supabase-js
// 2. Create .env.local with:
//    NEXT_PUBLIC_SUPABASE_URL=your_url
//    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
// 3. Uncomment below

// import { createClient } from "@supabase/supabase-js";
// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

export const supabase = null;

export async function submitEmailSignup(email: string): Promise<{ success: boolean; error?: string }> {
  console.log("Signup:", email);
  return { success: true };
}