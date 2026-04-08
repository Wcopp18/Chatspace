import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: settings } = await supabase
    .from("creator_settings")
    .select("*")
    .eq("setting_key", "promotions")
    .single();

  const promotions = settings?.setting_value || [];

  return NextResponse.json({ promotions });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, promotion, promotionId } = body;

  // Get existing promotions
  const { data: existing } = await supabase
    .from("creator_settings")
    .select("*")
    .eq("setting_key", "promotions")
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let promotions: any[] = (existing?.setting_value as any[]) || [];

  switch (action) {
    case "create": {
      const newPromo = {
        status: "active",
        ...promotion,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      promotions.push(newPromo);
      break;
    }
    case "update": {
      promotions = promotions.map((p) =>
        p.id === promotionId
          ? { ...p, ...promotion, updatedAt: new Date().toISOString() }
          : p
      );
      break;
    }
    case "duplicate": {
      const source = promotions.find((p) => p.id === promotionId);
      if (source) {
        const dup = {
          ...source,
          id: uuidv4(),
          title: `${source.title} (copy)`,
          status: "disabled",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        promotions.push(dup);
      }
      break;
    }
    case "delete": {
      promotions = promotions.filter((p) => p.id !== promotionId);
      break;
    }
    case "toggle": {
      promotions = promotions.map((p) =>
        p.id === promotionId
          ? { ...p, status: p.status === "active" ? "disabled" : "active", updatedAt: new Date().toISOString() }
          : p
      );
      break;
    }
    case "archive": {
      promotions = promotions.map((p) =>
        p.id === promotionId
          ? { ...p, status: "archived", updatedAt: new Date().toISOString() }
          : p
      );
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Upsert — check for DB errors
  let dbError;
  if (existing) {
    ({ error: dbError } = await supabase
      .from("creator_settings")
      .update({ setting_value: promotions, updated_at: new Date().toISOString() })
      .eq("setting_key", "promotions"));
  } else {
    ({ error: dbError } = await supabase
      .from("creator_settings")
      .insert({ setting_key: "promotions", setting_value: promotions }));
  }

  if (dbError) {
    return NextResponse.json({ error: "Failed to save", detail: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ promotions });
}
