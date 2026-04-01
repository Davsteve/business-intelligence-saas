import { supabase } from "../supabaseClient";

export async function getUserBusiness() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("business")
    .select("*")
    .eq("user_id", userData.user.id)
    .single();

  if (error) {
    console.error("Error fetching business:", error);
    return null;
  }

  return data;
}