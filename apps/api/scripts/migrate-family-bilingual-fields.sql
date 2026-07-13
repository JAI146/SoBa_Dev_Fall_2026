ALTER TABLE families
  ADD COLUMN IF NOT EXISTS head_of_family_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS detailed_address_ar TEXT,
  ADD COLUMN IF NOT EXISTS area_general_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS public_story_ar TEXT;
