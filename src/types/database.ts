/**
 * The database, in TypeScript.
 *
 * Hand-written to match `supabase/migrations/`. Once a Supabase project is
 * linked this file becomes generated output:
 *
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * Until then it is maintained alongside the migrations. The shape is the one
 * `supabase-js` expects, so passing `Database` to the client gives every query
 * in the app real column names and real nullability.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "x"
  | "threads"
  | "facebook"
  | "linkedin"
  | "github"
  | "twitch"
  | "spotify"
  | "soundcloud"
  | "pinterest"
  | "snapchat"
  | "discord"
  | "telegram"
  | "whatsapp"
  | "email"
  | "website";

export type BlockType =
  | "links"
  | "socials"
  | "text"
  | "image"
  | "image_gallery"
  | "video"
  | "embed"
  | "divider";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export type SubscriptionPlan = "free" | "pro";

/*
 * Type aliases, not interfaces, all the way down.
 *
 * postgrest's `GenericTable` requires `Row extends Record<string, unknown>`.
 * TypeScript gives object *type aliases* an implicit index signature but not
 * interfaces, so an interface here fails the constraint — and when it fails,
 * the client degrades to `never` for every argument and every result instead
 * of reporting an error. Reads still compile, because `never` is assignable to
 * anything, which is what makes the fault so quiet.
 */
type Timestamps = {
  created_at: string;
  updated_at: string;
};

type ProfileRow = Timestamps & {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  /**
   * When the owner chose this username. Null means a system placeholder is
   * still in place and onboarding is unfinished. Maintained by a database
   * trigger — a client that could write it could rename itself freely.
   */
  username_claimed_at: string | null;
};

type LinkRow = Timestamps & {
  id: string;
  profile_id: string;
  /**
   * The links block this link renders inside. Never null: a link with no
   * section has nowhere to appear, and a database trigger refuses a block
   * belonging to a different profile.
   */
  block_id: string;
  title: string;
  url: string;
  position: number;
  is_active: boolean;
};

type SocialLinkRow = Timestamps & {
  id: string;
  profile_id: string;
  platform: SocialPlatform;
  url: string;
  position: number;
  is_active: boolean;
};

type BlockRow = Timestamps & {
  id: string;
  profile_id: string;
  type: BlockType;
  position: number;
  data: Json;
  is_visible: boolean;
};

export type AnalyticsDevice = "mobile" | "tablet" | "desktop" | "unknown";

/**
 * An analytics event holds dimensions, never identities.
 *
 * No IP address, no user agent, no referrer URL. `source` is one of a fixed
 * set of identifiers, `referrer_host` is a bare hostname kept only for the
 * "other" bucket, and `visitor_hash` is a daily-rotating salted HMAC that is
 * meaningless tomorrow and unrelated across creators.
 */
type PageViewRow = {
  id: number;
  profile_id: string;
  created_at: string;
  source: string;
  referrer_host: string | null;
  country: string | null;
  device: AnalyticsDevice;
  visitor_hash: string | null;
};

type LinkClickRow = {
  id: number;
  profile_id: string;
  /** Null once the link is deleted; the click and its title survive. */
  link_id: string | null;
  link_title: string | null;
  created_at: string;
  source: string;
  referrer_host: string | null;
  country: string | null;
  device: AnalyticsDevice;
};

type SubscriptionRow = Timestamps & {
  id: string;
  profile_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus | null;
  plan: SubscriptionPlan;
  current_period_end: string | null;
};

type ReservedUsernameRow = {
  username: string;
  reason: string | null;
  created_at: string;
};

/** Columns the database fills in for us are optional on insert. */
type Insert<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insert<ProfileRow, "id" | "username">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      links: {
        Row: LinkRow;
        Insert: Insert<LinkRow, "profile_id" | "block_id" | "title" | "url">;
        Update: Partial<LinkRow>;
        Relationships: [];
      };
      social_links: {
        Row: SocialLinkRow;
        Insert: Insert<SocialLinkRow, "profile_id" | "platform" | "url">;
        Update: Partial<SocialLinkRow>;
        Relationships: [];
      };
      blocks: {
        Row: BlockRow;
        Insert: Insert<BlockRow, "profile_id" | "type">;
        Update: Partial<BlockRow>;
        Relationships: [];
      };
      page_views: {
        Row: PageViewRow;
        Insert: Insert<PageViewRow, "profile_id">;
        Update: Partial<PageViewRow>;
        Relationships: [];
      };
      link_clicks: {
        Row: LinkClickRow;
        Insert: Insert<LinkClickRow, "profile_id">;
        Update: Partial<LinkClickRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Insert<SubscriptionRow, "profile_id">;
        Update: Partial<SubscriptionRow>;
        Relationships: [];
      };
      reserved_usernames: {
        Row: ReservedUsernameRow;
        Insert: Insert<ReservedUsernameRow, "username">;
        Update: Partial<ReservedUsernameRow>;
        Relationships: [];
      };
    };
    /*
     * `Record<string, never>`, not `Record<never, never>`. The latter is `{}`,
     * which has no index signature and therefore does not satisfy postgrest's
     * `GenericSchema` — when that constraint fails the whole client degrades
     * silently, and every `.insert()` and `.update()` argument becomes `never`.
     * Reads keep working, so the fault only appears the first time something
     * writes.
     */
    Views: Record<string, never>;
    Functions: {
      /**
       * Replace the calling user's page in one transaction.
       *
       * `security invoker`, so Row Level Security applies to every statement
       * inside it and the function grants no authority the caller lacked. The
       * owner is `auth.uid()` rather than an argument, which is why there is
       * no profile id in `Args`.
       */
      save_page: {
        Args: { payload: Record<string, unknown> };
        Returns: undefined;
      };

      /*
       * Analytics, read as the creator.
       *
       * None of these takes a profile id. Every one is `security invoker`, so
       * Row Level Security decides whose rows they can see — which is a
       * stronger guarantee than validating an argument, because there is no
       * argument to get wrong.
       */
      analytics_overview: {
        Args: { p_from: string; p_to: string };
        Returns: { views: number; clicks: number; visitors: number }[];
      };
      analytics_timeseries: {
        Args: { p_from: string; p_to: string; p_bucket: string };
        Returns: { bucket: string; views: number; clicks: number }[];
      };
      analytics_top_links: {
        Args: { p_from: string; p_to: string; p_limit?: number };
        Returns: { link_id: string | null; title: string; clicks: number; deleted: boolean }[];
      };
      analytics_breakdown: {
        Args: { p_from: string; p_to: string; p_dimension: string };
        Returns: { key: string; views: number }[];
      };
      analytics_recent: {
        Args: { p_limit?: number };
        Returns: { kind: string; title: string | null; at: string }[];
      };
    };
    Enums: {
      social_platform: SocialPlatform;
      block_type: BlockType;
      analytics_device: AnalyticsDevice;
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
    };
    CompositeTypes: Record<string, never>;
  };
}

/** Convenience aliases, so features import a row type rather than a path. */
export type Profile = ProfileRow;
export type Link = LinkRow;
export type SocialLink = SocialLinkRow;
export type Block = BlockRow;
export type Subscription = SubscriptionRow;
