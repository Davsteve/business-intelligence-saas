import { supabase } from "../supabaseClient";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};