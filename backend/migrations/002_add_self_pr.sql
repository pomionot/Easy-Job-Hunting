-- Add self_pr column to profiles to store user's self-promotion text
ALTER TABLE profiles
  ADD COLUMN self_pr TEXT DEFAULT '';
