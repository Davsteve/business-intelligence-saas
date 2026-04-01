import { supabase } from "../supabaseClient";

// 🔹 GET CURRENT USER
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user:", error);
    return null;
  }

  return data.user;
}

// 🔹 SIGN UP
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data.user;

  // 🔥 Create business automatically
  if (user) {
    await supabase.from("business").insert([
      {
        user_id: user.id,
        name: "My Business",
      },
    ]);
  }

  return data;
}

// 🔹 SIGN IN
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// 🔹 SIGN OUT
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}