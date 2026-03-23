import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptString } from "@/lib/instagram/tokenCrypto";

type PublishBody = {
  imageUrl: string;
  caption: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json()) as Partial<PublishBody>;
  const imageUrl = body.imageUrl;
  const caption = body.caption;

  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
  }
  if (!caption || typeof caption !== "string") {
    return NextResponse.json({ error: "Missing caption" }, { status: 400 });
  }
  if (caption.length > 2200) {
    return NextResponse.json({ error: "Caption must be <= 2200 characters" }, { status: 400 });
  }

  const { data: account, error: accountErr } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, access_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountErr || !account) {
    return NextResponse.json(
      { error: "Instagram account not connected" },
      { status: 400 }
    );
  }

  const igUserId = account.ig_user_id;
  const accessToken = decryptString(account.access_token_encrypted);

  // 1) Create container
  const mediaUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
  const mediaRes = await fetch(mediaUrl, {
    method: "POST",
    // Meta accepts either application/x-www-form-urlencoded or query string.
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  if (!mediaRes.ok) {
    const text = await mediaRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to create media container: ${mediaRes.status} ${text}` },
      { status: 500 }
    );
  }

  const mediaJson = (await mediaRes.json()) as { id?: string };
  const creationId = mediaJson.id;
  if (!creationId) {
    return NextResponse.json({ error: "Media container creation returned no id" }, { status: 500 });
  }

  // 2) Publish container
  const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });

  if (!publishRes.ok) {
    const text = await publishRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to publish: ${publishRes.status} ${text}` },
      { status: 500 }
    );
  }

  const publishJson = (await publishRes.json()) as { id?: string };
  return NextResponse.json({
    ok: true,
    creation_id: creationId,
    publish_id: publishJson.id ?? null,
  });
}

