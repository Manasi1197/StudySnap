/*
  # Create Marketplace System

  1. New Tables
    - `marketplace_items` - Items for sale in the marketplace
    - `marketplace_categories` - Categories for organizing items
    - `marketplace_purchases` - Purchase history and transactions
    - `marketplace_reviews` - Reviews and ratings for items
    - `marketplace_favorites` - User favorites/wishlist
    - `seller_profiles` - Extended seller information
    - `marketplace_analytics` - Sales and view analytics

  2. Security
    - Enable RLS on all tables
    - Add policies for buyers, sellers, and public access
    - Ensure proper data isolation and permissions

  3. Features
    - Item listings with pricing and descriptions
    - Categories and tags for organization
    - Purchase system with transaction tracking
    - Review and rating system
    - Seller profiles and analytics
    - Favorites/wishlist functionality
*/

-- Create marketplace categories table
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#6366f1',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create seller profiles table
CREATE TABLE IF NOT EXISTS seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text,
  bio text,
  website_url text,
  social_links jsonb DEFAULT '{}',
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  total_sales integer DEFAULT 0,
  total_revenue decimal(10,2) DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create marketplace items table
CREATE TABLE IF NOT EXISTS marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('quiz', 'flashcard_set', 'study_material', 'course', 'template')),
  content_id uuid, -- References the actual content (quiz_id, material_id, etc.)
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  original_price decimal(10,2), -- For showing discounts
  currency text DEFAULT 'USD',
  preview_content jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'all')),
  subject text,
  language text DEFAULT 'en',
  thumbnail_url text,
  images text[] DEFAULT '{}',
  file_size integer,
  download_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  favorite_count integer DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  featured boolean DEFAULT false,
  featured_until timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create marketplace purchases table
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  purchase_price decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  payment_method text DEFAULT 'stripe',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id text,
  stripe_payment_intent_id text,
  download_limit integer DEFAULT 5,
  downloads_used integer DEFAULT 0,
  access_expires_at timestamptz,
  refund_reason text,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create marketplace reviews table
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  is_verified_purchase boolean DEFAULT true,
  helpful_votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, buyer_id) -- One review per item per buyer
);

-- Create marketplace favorites table
CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create marketplace analytics table
CREATE TABLE IF NOT EXISTS marketplace_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'favorite', 'purchase', 'download', 'review')),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller_id ON marketplace_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category_id ON marketplace_items(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_featured ON marketplace_items(featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_content_type ON marketplace_items(content_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_price ON marketplace_items(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_created_at ON marketplace_items(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer_id ON marketplace_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_seller_id ON marketplace_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_item_id ON marketplace_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_status ON marketplace_purchases(payment_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_item_id ON marketplace_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_buyer_id ON marketplace_reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_rating ON marketplace_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user_id ON marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_item_id ON marketplace_favorites(item_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_item_id ON marketplace_analytics(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_event_type ON marketplace_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_created_at ON marketplace_analytics(created_at);

-- Enable Row Level Security
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_categories (public read, admin write)
CREATE POLICY "Anyone can read active categories"
  ON marketplace_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for seller_profiles
CREATE POLICY "Anyone can read active seller profiles"
  ON seller_profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create their own seller profile"
  ON seller_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own seller profile"
  ON seller_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for marketplace_items
CREATE POLICY "Anyone can read published items"
  ON marketplace_items
  FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE POLICY "Sellers can read their own items"
  ON marketplace_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles
      WHERE seller_profiles.id = marketplace_items.seller_id
      AND seller_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can create items"
  ON marketplace_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_profiles
      WHERE seller_profiles.id = marketplace_items.seller_id
      AND seller_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own items"
  ON marketplace_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles
      WHERE seller_profiles.id = marketplace_items.seller_id
      AND seller_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_profiles
      WHERE seller_profiles.id = marketplace_items.seller_id
      AND seller_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for marketplace_purchases
CREATE POLICY "Users can read their own purchases"
  ON marketplace_purchases
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can read purchases of their items"
  ON marketplace_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles
      WHERE seller_profiles.id = marketplace_purchases.seller_id
      AND seller_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create purchases"
  ON marketplace_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can update their own purchases"
  ON marketplace_purchases
  FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- RLS Policies for marketplace_reviews
CREATE POLICY "Anyone can read reviews"
  ON marketplace_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for their purchases"
  ON marketplace_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_purchases
      WHERE marketplace_purchases.id = marketplace_reviews.purchase_id
      AND marketplace_purchases.buyer_id = auth.uid()
      AND marketplace_purchases.payment_status = 'completed'
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON marketplace_reviews
  FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- RLS Policies for marketplace_favorites
CREATE POLICY "Users can manage their own favorites"
  ON marketplace_favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for marketplace_analytics
CREATE POLICY "Sellers can read analytics for their items"
  ON marketplace_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_items
      JOIN seller_profiles ON seller_profiles.id = marketplace_items.seller_id
      WHERE marketplace_items.id = marketplace_analytics.item_id
      AND seller_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create analytics events"
  ON marketplace_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_marketplace_categories_updated_at
  BEFORE UPDATE ON marketplace_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_items_updated_at
  BEFORE UPDATE ON marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_purchases_updated_at
  BEFORE UPDATE ON marketplace_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_reviews_updated_at
  BEFORE UPDATE ON marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO marketplace_categories (name, description, icon, color) VALUES
  ('Quizzes', 'Interactive quizzes and assessments', '🧠', '#8b5cf6'),
  ('Flashcards', 'Study flashcard sets and decks', '📚', '#06b6d4'),
  ('Study Materials', 'Notes, guides, and study resources', '📝', '#10b981'),
  ('Courses', 'Complete learning courses and curricula', '🎓', '#f59e0b'),
  ('Templates', 'Reusable templates and frameworks', '📋', '#ef4444'),
  ('Practice Tests', 'Mock exams and practice assessments', '✅', '#6366f1')
ON CONFLICT (name) DO NOTHING;

-- Functions to update item statistics
CREATE OR REPLACE FUNCTION update_item_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating and review count
  IF TG_TABLE_NAME = 'marketplace_reviews' THEN
    UPDATE marketplace_items
    SET 
      average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM marketplace_reviews
        WHERE item_id = NEW.item_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM marketplace_reviews
        WHERE item_id = NEW.item_id
      )
    WHERE id = NEW.item_id;
  END IF;

  -- Update favorite count
  IF TG_TABLE_NAME = 'marketplace_favorites' THEN
    UPDATE marketplace_items
    SET favorite_count = (
      SELECT COUNT(*)
      FROM marketplace_favorites
      WHERE item_id = NEW.item_id
    )
    WHERE id = NEW.item_id;
  END IF;

  -- Update download count
  IF TG_TABLE_NAME = 'marketplace_purchases' AND NEW.payment_status = 'completed' THEN
    UPDATE marketplace_items
    SET download_count = download_count + 1
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating statistics
CREATE TRIGGER update_item_stats_on_review
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_item_stats();

CREATE TRIGGER update_item_stats_on_favorite
  AFTER INSERT OR DELETE ON marketplace_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_item_stats();

CREATE TRIGGER update_item_stats_on_purchase
  AFTER INSERT OR UPDATE ON marketplace_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_item_stats();

-- Function to update seller statistics
CREATE OR REPLACE FUNCTION update_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE seller_profiles
    SET 
      total_sales = total_sales + 1,
      total_revenue = total_revenue + NEW.purchase_price,
      average_rating = (
        SELECT COALESCE(AVG(r.rating), 0)
        FROM marketplace_reviews r
        JOIN marketplace_items i ON i.id = r.item_id
        WHERE i.seller_id = NEW.seller_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM marketplace_reviews r
        JOIN marketplace_items i ON i.id = r.item_id
        WHERE i.seller_id = NEW.seller_id
      )
    WHERE id = NEW.seller_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating seller statistics
CREATE TRIGGER update_seller_stats_on_purchase
  AFTER INSERT OR UPDATE ON marketplace_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_stats();